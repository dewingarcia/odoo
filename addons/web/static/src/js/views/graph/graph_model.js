odoo.define('web.GraphModel', function (require) {
"use strict";

var core = require('web.core');
var BasicModel = require('web.BasicModel');

var _t = core._t;

return BasicModel.extend({
    load: function(model, params) {
        var record = this._make_list(model, params);
        record.measure = params.measure;
        return this._load_graph(record.id);
    },
    reload: function(id) {
        return this._load_graph(id);
    },
    set_measure: function(id, measure) {
        var element = this.local_data[id];
        element.measure = measure;
        return this;
    },
    _load_graph: function(id) {
        var self = this;
        var element = this.local_data[id];
        var fields = element.grouped_by;
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
