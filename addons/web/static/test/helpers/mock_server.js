odoo.define('web.MockServer', function (require) {
"use strict";

var Class = require('web.Class');
var data = require('web.data');
var pyeval = require('web.pyeval');
var utils = require('web.utils');


// helper function: traverse a tree and apply the function f to each of its
// nodes.
// A tree in this situation is defined as a javascript object with
// a 'children' key, which contains an array of trees.
// Note: this should be abstracted somewhere in web.utils, or in web.tree_utils
function _traverse(tree, f) {
    if (f(tree)) {
        _.each(tree.children, function(c) { _traverse(c, f); });
    }
}

var MockServer = Class.extend({
    init: function(data) {
        this.data = data;
        this.logRPC = false;
    },

    // helper: read a string describing an arch, and returns a simulated
    // 'field_view_get' call to the server.
    // params:
    // * arch: a string OR a parsed xml document
    // * model: a string describing a model (that should be in this.data)
    fieldsViewGet: function(arch, model) {
        var self = this;

        if (typeof arch === 'string') {
            var doc = $.parseXML(arch).documentElement;
            arch = utils.xml_to_json(doc, true);
        }
        var fields = this.data[model].fields;
        var onchanges = this.data[model].onchanges || {};

        var fieldNodes = {};

        _traverse(arch, function(node) {
            if (typeof node === "string") {
                return false;
            }
            if (node.tag === 'field') {
                fieldNodes[node.attrs.name] = node;
                return false;
            }
            if (node.attrs.invisible) {
                node.attrs.modifiers = JSON.stringify({
                    invisible: pyeval.py_eval(node.attrs.invisible),
                });
            }
            return true;
        });

        var viewFields = $.extend(true, {}, fields);
        _.each(fieldNodes, function(node, name) {
            var field = viewFields[name];
            field.__attrs = node.attrs;
            if (node.attrs.widget === 'statusbar' && fields[node.attrs.name].type === 'many2one') {
                field.__fetch_status = true;
            }
            if (field.type === "one2many" || field.type === "many2many") {
                field.views = {};
                _.each(node.children, function(children) {
                    field.views[children.tag] = self.fieldsViewGet(children, field.relation);
                });
            }
            var modifiers = {};
            if (node.attrs.invisible) {
                modifiers.invisible = pyeval.py_eval(node.attrs.invisible);
            }
            node.attrs.modifiers = JSON.stringify(modifiers);

            // add onchanges
            if (name in onchanges) {
                node.attrs.on_change="1";
            }
        });
        var result = {
            arch: arch,
            fields: viewFields,
        };
        if (this.logRPC) {
            console.log('Mock server field_view_get', result);
        }
        return result;
    },
    // simulate a read_group call to the server.
    // Note: most of the keys in kwargs are still ignored
    // params:
    // * model: a string describing an existing model
    // * kwargs: an object describing the various options supported by read_group
    //   - kwargs.lazy: boolean, still mostly ignored
    //   - limit: integer (ignored as well)
    //   - ...
    _mockReadGroup: function(model, kwargs) {
        if (!('lazy' in kwargs)) {
            kwargs.lazy = true;
        }
        var fields = this.data[model].fields;
        var groupByField = kwargs.groupby[0];
        var result = [];

        function aggregateFields(group, records) {
            var type;
            for (var i = 0; i < kwargs.fields.length; i++) {
                type = fields[kwargs.fields[i]].type;
                if (type === 'float' || type === 'integer') {
                    group[kwargs.fields[i]] = 0;
                    for (var j = 0; j < records.length; j++) {
                        group[kwargs.fields[i]] += records[j][kwargs.fields[i]];
                    }
                }
            }
        }
        if (groupByField) {
            _.each(_.groupBy(this.data[model].records, groupByField), function(g, val) {
                val = g[0][groupByField];
                var group = {
                    __domain: [[groupByField, "=", val instanceof Array ? val[0] : val]]
                };
                group[groupByField] = val;

                // compute count key to match dumb server logic...
                var countKey;
                if (kwargs.lazy) {
                    countKey = groupByField + "_count";
                } else {
                    countKey = "__count";
                }
                group[countKey] = g.length;
                result.push($.extend(true, {}, group));
                aggregateFields(group, g);
            });
        } else {
            var group = { __count: this.data[model].records.length };
            aggregateFields(group, this.data[model].records);
            result.push(group);
        }

        if (this.logRPC) {
            console.log('Mock server result:.', result);
        }
        return $.when(result);
    },
    _mockSearchRead: function(args) {
        var records = [];
        if (args.domain.length) {
            records = _.filter(this.data[args.model].records, function(record) {
                var fields = _.mapObject(record, function (value) {
                    return {value: value instanceof Array ? value[0] : value};
                });
                return data.compute_domain(args.domain, fields);
            });
        } else {
            records = this.data[args.model].records;
        }
        var result = {
            length: records.length,
            records: _.map(records, function(r) {
                return _.pick(r, args.fields);
            }),
        };
        if (this.logRPC) {
            console.log('Mock server result:.', result);
        }
        return $.when($.extend(true, {}, result));
    },
    _mockRead: function(model, args, _kwargs) {
        var self = this;
        var ids = args[0];
        if (!_.isArray(ids)) {
            ids = [ids];
        }
        var fields = _.uniq(args[1].concat(['id']));
        var result = _.map(ids, function(id) {
            return _.pick(_.findWhere(self.data[model].records, {id: id}), fields);
        });
        if (this.logRPC) {
            console.log('Mock server result:.', result);
        }
        return $.when($.extend(true, {}, result));
    },
    // not yet fully implemented (missing: limit, and evaluate operators)
    _nameSearch: function(model, _kwargs) {
        var names = _.map(this.data[model].records, function (record) {
            return [record.id, record.display_name];
        });
        if (this.logRPC) {
            console.log('Mock server result:.', names);
        }
        return $.when(names);
    },
    _write: function(model, args) {
        var record = this.data[model].records.find(function (record) {
            return record.id === args[0][0];
        });
        _.extend(record, args[1]);
        return $.when(true);
    },
    _onchange: function(model, args) {
        var onchanges = this.data[model].onchanges;
        var record = args[1];
        var fields = args[2];
        var result = {};
        _.each(fields, function(field) {
            var changes = _.clone(record);
            onchanges[field](changes);
            _.each(changes, function(value, key) {
                if (record[key] !== value) {
                    result[key] = value;
                }
            });
        });
        return $.when({value: result});
    },
    performRpc: function(route, args) {
        if (this.logRPC) {
            console.log('Mock server called.', route, args);
        }
        if (route === "/web/dataset/search_read") {
            return this._mockSearchRead(args);
        }
        if (args.method === "read_group") {
            return this._mockReadGroup(args.model, args.kwargs);
        }
        if (args.method === 'read') {
            return this._mockRead(args.model, args.args, args.kwargs);
        }
        if (args.method === 'name_search') {
            return this._nameSearch(args.model, args.kwargs);
        }
        if (args.method === 'write') {
            return this._write(args.model, args.args);
        }
        if (args.method === 'onchange') {
            return this._onchange(args.model, args.args);
        }

        console.error("Unimplemented route", route, args);
        return $.when();
    },
});

return MockServer;

});
