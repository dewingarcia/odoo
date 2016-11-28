odoo.define('web.basic_model_tests', function (require) {
"use strict";

var BasicModel = require('web.BasicModel');
var MockServer = require('web.MockServer');

function makeModel(data) {
    var basicModel = new BasicModel();
    var mockServer = new MockServer(data);
    basicModel.perform_rpc = mockServer.performRpc.bind(mockServer);
    return basicModel;
}

function demoData() {
    return {
        partner: {
            fields: {
                display_name: {string: "STRING", type: 'char'},
                foo: {string: "Foo", type: 'char'},
                bar: {string: "Bar", type: 'integer'},
            },
            records: [
                {id: 1, foo: 'blip', bar: 1},
                {id: 2, foo: 'gnap', bar: 2},
            ]
        }
    };
}

QUnit.module('Basic Model');


QUnit.test('simple functionality', function(assert) {
    var data = demoData();
    var model = makeModel(data);
    assert.equal(model.get(1), null, "should return null for non existing key");


    var params = {
        id: 2,
        fields: data.partner.fields,
        field_names: ['foo'],
    };
    model.load('partner', params).then(function(resultID) {
        // it is a string, because it is used as a key in an object
        assert.equal(typeof resultID, 'string', "result should be a valid id");

        var record = model.get(resultID);
        assert.equal(record.res_id, 2, "res_id read should be the same as asked");
        assert.ok(record.is_record, "should be of type 'record'");
        assert.equal(record.data.foo, "gnap", "should correctly read value");
        assert.equal(record.data.bar, undefined, "should not fetch the field 'bar'");
    });
});

});