odoo.define('web.field_utils_tests', function (require) {
"use strict";

var core = require('web.core');
var fieldUtils = require('web.field_utils');
var time = require('web.time');

QUnit.module('Field utils (formatters)');

QUnit.test('format integer', function(assert) {
    var originalGrouping = core._t.database.parameters.grouping;

    core._t.database.parameters.grouping = [3, 3, 3, 3];
    assert.equal(fieldUtils.format_integer(1000000), '1,000,000');

    core._t.database.parameters.grouping = [3, 2, -1];
    assert.equal(fieldUtils.format_integer(106500), '1,06,500');

    core._t.database.parameters.grouping = [1, 2, -1];
    assert.equal(fieldUtils.format_integer(106500), '106,50,0');

    assert.equal(fieldUtils.format_integer(0), "0");
    assert.equal(fieldUtils.format_integer(undefined), "");

    core._t.database.parameters.grouping = originalGrouping;
});

QUnit.test('format float', function(assert) {
    var originalParameters = $.extend(true, {}, core._t.database.parameters);

    core._t.database.parameters.grouping = [3, 3, 3, 3];
    assert.equal(fieldUtils.format_float(1000000), '1,000,000.00');

    core._t.database.parameters.grouping = [3, 2, -1];
    assert.equal(fieldUtils.format_float(106500), '1,06,500.00');

    core._t.database.parameters.grouping = [1, 2, -1];
    assert.equal(fieldUtils.format_float(106500), '106,50,0.00');

    _.extend(core._t.database.parameters, {
        grouping: [3, 0],
        decimal_point: ',',
        thousands_sep: '.'
    });
    assert.equal(fieldUtils.format_float(6000), '6.000,00');

    core._t.database.parameters = originalParameters;
});

QUnit.test("format_datetime", function (assert) {
    var date_string = "2009-05-04 12:34:23";
    var date = time.str_to_datetime(date_string);
    var str = fieldUtils.format_datetime(date_string);
    assert.equal(str, moment(date).format("MM/DD/YYYY HH:mm:ss"));
});

// QUnit.test("format_date", function (assert) {
//     var date_string = "2009-05-04 12:34:23";
//     var date = time.str_to_datetime(date_string);
//     var str = fieldUtils.format_date(date_string);
//     assert.equal(str, moment(date).format("MM/DD/YYYY"));
// });

//     test("format_time", function (assert, formats, time) {
//         var date = time.str_to_datetime("2009-05-04 12:34:23");
//         var str = formats.format_value(date, {type:"time"});
//         assert.equal(str, moment(date).format("HH:mm:ss"));
//     });

//     test("format_float_time", function (assert, formats) {
//         assert.strictEqual(
//             formats.format_value(1.0, {type:'float', widget:'float_time'}),
//             '01:00');
//         assert.strictEqual(
//             formats.format_value(0.9853, {type:'float', widget:'float_time'}),
//             '00:59');
//         assert.strictEqual(
//             formats.format_value(0.0085, {type:'float', widget:'float_time'}),
//             '00:01');
//         assert.strictEqual(
//             formats.format_value(-1.0, {type:'float', widget:'float_time'}),
//             '-01:00');
//         assert.strictEqual(
//             formats.format_value(-0.9853, {type:'float', widget:'float_time'}),
//             '-00:59');
//         assert.strictEqual(
//             formats.format_value(-0.0085, {type:'float', widget:'float_time'}),
//             '-00:01');
//         assert.strictEqual(
//             formats.format_value(4.9999, {type:'float', widget:'float_time'}),
//             '05:00');
//         assert.strictEqual(
//             formats.format_value(-6.9999, {type:'float', widget:'float_time'}),
//             '-07:00');
//     });

//     test("format_float", ['web.core'], function (assert, formats, time, core) {
//         var fl = 12.1234;
//         var str = formats.format_value(fl, {type:"float"});
//         assert.equal(str, "12.12");
//         assert.equal(formats.format_value(12.02, {type: 'float'}),
//               '12.02');
//         assert.equal(formats.format_value(0.0002, {type: 'float', digits: [1, 3]}),
//               '0.000');
//         assert.equal(formats.format_value(0.0002, {type: 'float', digits: [1, 4]}),
//               '0.0002');
//         assert.equal(formats.format_value(0.0002, {type: 'float', digits: [1, 6]}),
//               '0.000200');
//         assert.equal(formats.format_value(1, {type: 'float', digits: [1, 6]}),
//               '1.000000');
//         assert.equal(formats.format_value(1, {type: 'float'}),
//               '1.00');
//         assert.equal(formats.format_value(-11.25, {type: 'float'}),
//               "-11.25");
//         core._t.database.parameters.grouping = [1, 2, -1];
//         assert.equal(formats.format_value(1111111.25, {type: 'float'}),
//               "1111,11,1.25");

//         core._t.database.parameters.grouping = [1, 0];
//         assert.equal(formats.format_value(-11.25, {type: 'float'}),
//               "-1,1.25");
//     });

//     test('parse_integer', ['web.core'], function (assert, formats, time, core) {
//         var tmp = core._t.database.parameters.thousands_sep;
//         try {
//             var val = formats.parse_value('123,456', {type: 'integer'});
//             assert.equal(val, 123456);
//             core._t.database.parameters.thousands_sep = '|';
//             var val2 = formats.parse_value('123|456', {type: 'integer'});
//             assert.equal(val2, 123456);
//         } finally {
//             core._t.database.parameters.thousands_sep = tmp;
//         }
//     });

//     test("parse_float", ['web.core'], function (assert, formats, time, core) {
//         var tmp1 = core._t.database.parameters.thousands_sep;
//         var tmp2 = core._t.database.parameters.decimal_point;
//         try {
//             var str = "134,112.1234";
//             var val = formats.parse_value(str, {type:"float"});
//             assert.equal(val, 134112.1234);
//             str = "-134,112.1234";
//             val = formats.parse_value(str, {type:"float"});
//             assert.equal(val, -134112.1234);
//             _.extend(core._t.database.parameters, {
//                 decimal_point: ',',
//                 thousands_sep: '.'
//             });
//             var val3 = formats.parse_value('123.456,789', {type: 'float'});
//             assert.equal(val3, 123456.789);
//         } finally {
//             core._t.database.parameters.thousands_sep = tmp1;
//             core._t.database.parameters.decimal_point = tmp2;
//         }
//     });




//     test('ES date format', ['web.core'], function (assert, formats, time, core) {
//         var old_format = core._t.database.parameters.date_format;
//         core._t.database.parameters.date_format = '%a, %Y %b %d';
        
//         var date = time.str_to_date("2009-05-04");
//         assert.strictEqual(formats.format_value(date, {type:"date"}),
//                     'Mon, 2009 May 04');
//         assert.strictEqual(formats.parse_value('Mon, 2009 May 04', {type: 'date'}),
//                     '2009-05-04');
//         core._t.database.parameters.date_format = old_format;
//     });

//     test('extended ES date format', ['web.core'], function (assert, formats, time, core) {
//         var old_format = core._t.database.parameters.date_format;
//         core._t.database.parameters.date_format = '%a, %Y.eko %b %da';
//         var date = time.str_to_date("2009-05-04");
//         assert.strictEqual(formats.format_value(date, {type:"date"}),
//                     'Mon, 2009.eko May 04a');
//         assert.strictEqual(formats.parse_value('Mon, 2009.eko May 04a', {type: 'date'}),
//                     '2009-05-04');
//         core._t.database.parameters.date_format = old_format;
//     });

// });

});
