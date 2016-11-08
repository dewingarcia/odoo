odoo.define('web.test_model', function (require) {
"use strict";

var Model = require('web.BasicModel');
var utils = require('web.utils');
var pyeval = require('web.pyeval');
var data = require('web.data');

//----------------------------------------------------------------------------------
//  FIELDS
//----------------------------------------------------------------------------------
var fields = {
    display_name: {
        string: "Displayed name",
        type: "char",
    },
    f1: {
        string: "CharField1",
        type: "char",
        sortable: true,
        required: true,
    },
    f2: {
        string: "BooleanField",
        type: "boolean",
    },
    f3: {
        string: "something_id",
        type: "many2one",
        relation: "something.whatever",
    },
    f4: {
        string: "iamafloat",
        type: "float",
        digits: [16,1],
    },
    f5: {
        string: "text field",
        type: "text",
    },
    f6: {
        string: "one2many field",
        type: "one2many",
        relation: 'foo',
    },
    f7: {
        string: "sequence number",
        type: "integer",
    },
    f8: {
        string: "some_count",
        type: "integer",
    },
    f9: {
        string: "timmy",
        type: "many2many",
    }
};


//----------------------------------------------------------------------------------
//  DATA
//----------------------------------------------------------------------------------
var DATA = [{
    id: 1,
    display_name: "agrolait",
    f1: "abcd",
    f2: true,
    f3: [3, "hello"],
    f4: 0.1,
    f5: "asdf",
    f6: [],
    f7: 1,
    f9: [],
},{
    id: 12,
    display_name: "think big systems",
    f1: "bar",
    f2: false,
    f3: [5, "xmo"],
    f4: 4.3,
    f6: [1],
    f7: 2,
    f9: [],
},{
    id: 14,
    display_name: "jackson group",
    f1: false,
    f2: true,
    f3: [5, "xmo"],
    f4: 1.234,
    f6: [1,12,14],
    f7: 3,
    f9: [],
},{
    id: 42,
    display_name: "asustek",
    f1: "blip",
    f2: false,
    f3: [3, "hello"],
    f4: -1.23,
    f7: 4,
    f9: [],
}];

//----------------------------------------------------------------------------------
//  MODEL
//----------------------------------------------------------------------------------
function rpc(route, args) {
    var result;
    if (route === "/web/dataset/search_read") {
        var dataset = DATA;
        if (args.domain.length) {
            dataset = _.filter(DATA, function(record) {
                var fields = _.mapObject(record, function (value) {
                    return {value: value instanceof Array ? value[0] : value};
                });
                return data.compute_domain(args.domain, fields);
            });
        }
        result = {
            length: dataset.length,
            records: dataset,
        };
    }
    if (route === "/web/dataset/call_kw/foo/read") {
        var ids = args.args[0];
        var fields = _.uniq(args.args[1].concat(['id']));
        ids = _.isArray(ids) ? ids : [ids];
        result = _.map(ids, function(id) {
            return _.pick(_.findWhere(DATA, {id: id}), fields);
        });
    }
    if (route === '/web/dataset/call_kw/foo/read_group') {
        if (args.kwargs.groupby[0] === "f1") {
            result = [
                {
                    __domain: [["f1", "=", "abcd"]],
                    f1: "abcd",
                    f1_count: 1,
                }, {
                    __domain: [["f1", "=", "bar"]],
                    f1: "bar",
                    f1_count: 1,
                }, {
                    __domain: [["f1", "=", false]],
                    f1: false,
                    f1_count: 1,
                }, {
                    __domain: [["f1", "=", "blip"]],
                    f1: "blip",
                    f1_count: 1,
                }
            ];
        } else {
            result = [
                {
                    __domain: [["f3", "=", 3]],
                    f3: [3, "hello"],
                    f3_count: 2,
                    f4: -1.1,
                }, {
                    __domain: [["f3", "=", 5]],
                    f3: [5, "xmo"],
                    f3_count: 2,
                    f4: 5.5,
                }
            ];
        }
        return $.when(result);
    }
    if (route === "/web/dataset/call_kw/something.whatever/name_search") {
        result = _.uniq(_.pluck(DATA, 'f3'), function (value) {
            return value[0]; // id of m2o value
        });
    }
    return $.when($.extend(true, {}, result));
}

function traverse(tree, f) {
    if (f(tree)) {
        _.each(tree.children, function(c) { traverse(c, f); });
    }
}

function parse_arch(str) {
    var doc = $.parseXML(str).documentElement;
    return utils.xml_to_json(doc, true);
}

function _get_fields_view(arch) {
    var field_nodes = {};

    traverse(arch, function(node) {
        if (typeof node === "string") {
            return false;
        }
        if (node.tag === 'field') {
            field_nodes[node.attrs.name] = node;
            return false;
        }
        if (node.attrs.invisible) {
            node.attrs.modifiers = JSON.stringify({
                invisible: pyeval.py_eval(node.attrs.invisible),
            });
        }
        return true;

    });
    var view_fields = {};
    _.each(field_nodes, function(node, name) {
        view_fields[name] = $.extend(true, {views: {}}, fields[name]);
        var field = view_fields[name];
        field.__attrs = node.attrs;
        if (node.attrs.widget === 'statusbar' && fields[node.attrs.name].type === 'many2one') {
            field.__fetch_status = true;
        }
        if (field.type === "one2many") {
            _.each(node.children, function(children) {
                field.views[children.tag] = _get_fields_view(children);
            });
        }
        var modifiers = {};
        if (node.attrs.invisible) {
            modifiers.invisible = pyeval.py_eval(node.attrs.invisible);
        }
        node.attrs.modifiers = JSON.stringify(modifiers);
    });
    return {
        arch: arch,
        fields: view_fields,
    };
}

function get_fields_view(raw_arch) {
    var arch = parse_arch(raw_arch);
    return _get_fields_view(arch);
}


return {
    get_model: function() {
        var model = new Model();
        model.perform_rpc = rpc;
        return model;
    },
    get_fields_view: get_fields_view,
};

});
