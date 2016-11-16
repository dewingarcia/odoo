odoo.define('web.GraphModel', function (require) {
"use strict";

var core = require('web.core');
var BasicModel = require('web.BasicModel');

var _t = core._t;

return BasicModel.extend({
    init: function(fields_view) {
        this.initialMode = fields_view.arch.attrs.type || 'bar';
        this.initialMeasure = '__count__';
        this.initialGroupBys = [];
        this._super.apply(this, arguments);
    },
    _process_fields_view: function(fields_view) {
        var self = this;
        var fields = fields_view.fields;
        fields.__count__ = {string: _t("Count"), type: "integer"};
        fields_view.arch.children.forEach(function(field) {
            var name = field.attrs.name;
            if (field.attrs.interval) {
                name += ':' + field.attrs.interval;
            }
            if (field.attrs.type === 'measure') {
                self.measure = name;
            } else {
                self.initialGroupBys.push(name);
            }
        });
        return fields;
    },
    load: function(model, params) {
        if (!params.grouped_by.length) {
            var grouped_by = params.context.graph_groupbys ||
                             (params.grouped_by.length && params.grouped_by) ||
                             this.initialGroupBys;
            params.grouped_by = grouped_by.slice(0);
        }
        params.fields = this.fields;
        var record = this._make_list(model, params);
        record.measure = params.measure || this.initialMeasure;
        record.mode = params.mode || this.initialMode;
        return this._load_graph(record.id);
    },
    reload: function(id) {
        return this._load_graph(id);
    },
    import: function(obj, params) {
        return this._super(obj, _.extend({
            mode: obj.mode || this.initialMode,
            measure: obj.measure || this.initialMeasure,
        }, params));
    },
    set_group_by: function(list_id, group_by) {
        if (!group_by.length) {
            group_by = this.initialGroupBys;
        }
        return this._super(list_id, group_by);
    },
    set_measure: function(id, measure) {
        var element = this.local_data[id];
        element.measure = measure;
        return this;
    },
    set_mode : function(id, mode) {
        var element = this.local_data[id];
        element.mode = mode;
        return this;
    },
    _load_graph: function(id) {
        var self = this;
        var element = this.local_data[id];
        var fields = _.map(element.grouped_by, function(grouped_by) {
            return grouped_by.split(':')[0];
        });
        if (element.measure !== '__count__') {
            fields = fields.concat(element.measure);
        }
        return this.perform_model_rpc(element.model, 'read_group', [], {
            context: element.context,
            domain: element.domain,
            fields: fields,
            groupby: element.grouped_by,
            lazy: false,
        }).then(function(raw_data) {
            var is_count = element.measure === '__count__';
            var data_pt, labels;

            element.data = [];
            for (var i = 0; i < raw_data.length; i++) {
                data_pt = raw_data[i];
                labels = _.map(element.grouped_by, function(field) {
                    return self.sanitize_value(data_pt[field], field, element.fields);
                });
                element.data.push({
                    value: is_count ? data_pt.__count : data_pt[element.measure],
                    labels: labels
                });
            }
            return id;
        });
    },
    sanitize_value: function (value, field, fields) {
        if (value === false) return _t("Undefined");
        if (value instanceof Array) return value[1];
        if (field && fields[field] && (fields[field].type === 'selection')) {
            var selected = _.where(fields[field].selection, {0: value})[0];
            return selected ? selected[1] : value;
        }
        return value;
    },
});

});
