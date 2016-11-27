odoo.define('web.data_tests', function (require) {
"use strict";

var data = require('web.data');

QUnit.module('data (compute domain)');

QUnit.test("basic", function (assert) {
    var fields = {
        'a': {value: 3},
        'group_method': {value: 'line'},
        'select1': {value: 'day'},
        'rrule_type': {value: 'monthly'}
    };
    assert.ok(data.compute_domain(
        [['a', '=', 3]], fields));
    assert.ok(data.compute_domain(
        [['group_method','!=','count']], fields));
    assert.ok(data.compute_domain(
        [['select1','=','day'], ['rrule_type','=','monthly']], fields));
});

QUnit.test("or", function (assert) {
    var web = {
        'section_id': {value: null},
        'user_id': {value: null},
        'member_ids': {value: null}
    };

    var domain = ['|', ['section_id', '=', 42],
                    '|', ['user_id','=',3],
                        ['member_ids', 'in', [3]]];

    assert.ok(data.compute_domain(domain, _.extend(
        {}, web, {'section_id': {value: 42}})));
    assert.ok(data.compute_domain(domain, _.extend(
        {}, web, {'user_id': {value: 3}})));

    assert.ok(data.compute_domain(domain, _.extend(
        {}, web, {'member_ids': {value: 3}})));
});

QUnit.test("not", function (assert) {
    var fields = {
        'a': {value: 5},
        'group_method': {value: 'line'}
    };
    assert.ok(data.compute_domain(
        ['!', ['a', '=', 3]], fields));
    assert.ok(data.compute_domain(
        ['!', ['group_method','=','count']], fields));
});

});