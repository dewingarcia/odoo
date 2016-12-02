odoo.define('web.action_manager_tests', function (require) {
"use strict";

var ActionManager = require('web.ActionManager');
var MockServer = require('web.MockServer');
var testUtils = require('web.test_utils');

function makeActionManager(data, options) {
    var actionManager = new ActionManager();
    var Server = options.mockRPC ? MockServer.extend({performRpc: options.mockRPC}) : MockServer;
    var mockServer = new Server(data);

    testUtils.intercept(actionManager, 'perform_rpc', function(event) {
        mockServer.performRpc(event.data.route, event.data.args).then(function() {
            if (event.data.on_success) {
                event.data.on_success.apply(null, arguments);
            }
        });
    });
    return actionManager;
}

QUnit.module('Action Manager', {
    beforeEach: function() {
        this.data = {
            'ir.action': {
                fields: {
                    type: {string: "Type", type: "char"},
                    target: {string: "Target", type: "char"},
                    view_ids: {string: "Views", type: "many2many"},
                    view_mode: {string: "Views", type: "char"},
                },
                records: [{
                    id: 12,
                    type: "ir.actions.act_window",
                    target: "current",
                    view_ids: [2, 4, 14],
                    view_mode: "kanban,list,form",
                }]
            },
        };
    },
});

QUnit.test('basic functionality', function(assert) {
    assert.expect(3);
    var actionManager = makeActionManager(this.data, {
        mockRPC: function(route, args) {
            if (route === '/web/action/load') {
                assert.ok(true, "should call the route /web/action/load");
            }
            return this._super(route, args);
        },
    });

    assert.equal(actionManager.actions.length, 0, "should have zero actions");

    actionManager.doAction(12);
    assert.equal(actionManager.actions.length, 1, "should have one actions");
});

});