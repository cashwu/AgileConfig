﻿app.factory('nodeStatusReflushService', function ($http, $interval) {
    var service = {
        started: false,
        serverNodes: [],
        uiNodes: []
    };

    var reflushNodeStatus = function () {
        if (service.started) {
            $http.get('/report/RemoteNodesStatus?_=' + (new Date).getTime())
                .then(r => {
                    for (var i = 0; i < r.data.length; i++) {
                        service.serverNodes = r.data;
                        if (service.callback) {
                            service.callback(service.serverNodes);
                        }
                    }
                }, err => {
                    console.log(err);
                });
        }
    };

    service.start = function (callback) {
        service.callback = callback;
        if (!service.started) {
            service.started = true;
            reflushNodeStatus();
            $interval(reflushNodeStatus, 5 * 1000);
        }
    };

    return service;
});

app.controller('nodesCtrl', function ($state) {
    $state.go('nodes.list');
});

app.controller('ListnodeCtrl', function ($scope, $http, $state, nodeStatusReflushService) {
    $scope.toAdd = function () {
        $state.go('nodes.add');
    };
    $scope.deleteNode = function (node, index) {
        let cr = confirm(`是否确定删除节点【${node.address}】? \n删除节点并不会让其真正的下线，只是脱离控制台的管理。所有连接至此节点的客户端都会继续正常工作。`);
        if (!cr) {
            return;
        }

        $http.post('/servernode/delete', node)
            .then(r => {
                if (r.data.success) {
                    $scope.nodes.splice(index, 1);
                } else {
                    alert(r.data.message);
                }
            }, err => {
                console.log(err);
                alert(err.statusText);
            });
    };

    $scope.nodeClientsReflushConfigItems = function (address) {
        $http.post('/RemoteServerProxy/AllClients_Reload?address=' + address)
            .then(r => {
                if (r.data.success) {
                    alert("刷新成功。");
                } else {
                    alert(r.data.message);
                }
            }, err => {
                console.log(err);
                alert(err.statusText);
            });
    };

    var load = function () {
        $http.get('/servernode/all?_=' + (new Date).getTime())
            .then(r => {
                if (r.data.success) {
                    $scope.nodes = r.data.data;
                    nodeStatusReflushService.start((serverNodes) => {
                        for (var i = 0; i < serverNodes.length; i++) {
                            var node = serverNodes[i].n;
                            if ($scope.nodes) {
                                var uiNode = $scope.nodes.find(n => n.address === node.address);
                                if (uiNode) {
                                    uiNode.lastEchoTime = node.lastEchoTime;
                                    uiNode.status = node.status;
                                }
                            }
                        }
                    });
                }
            }, err => {
                console.log(err);
                alert(err.statusText);
            });
    };
    load();
});