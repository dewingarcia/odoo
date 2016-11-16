odoo.define('web.PivotModel', function (require) {
"use strict";

var core = require('web.core');
var utils = require('web.utils');
var BasicModel = require('web.BasicModel');

var _t = core._t;

function find_path_in_tree(root, path) {
    var i,
        l = root.path.length;
    if (l === path.length) {
        return (root.path[l-1] === path[l - 1]) ? root : null;
    }
    for (i = 0; i < root.children.length; i++) {
        if (root.children[i].path[l] === path[l]) {
            return find_path_in_tree(root.children[i], path);
        }
    }
    return null;
}

function traverse_tree(root, f, arg1, arg2, arg3) {
    f(root, arg1, arg2, arg3);
    if (!root.expanded) return;
    for (var i = 0; i < root.children.length; i++) {
        traverse_tree(root.children[i], f, arg1, arg2, arg3);
    }
}


function get_header_depth(header) {
    var depth = 1;
    traverse_tree(header, function (hdr) {
        depth = Math.max(depth, hdr.path.length);
    });
    return depth;
}



return BasicModel.extend({
    init: function() {
        this.initialRowGroupBys = [];
        this.initialColGroupBys = [];
        this.initialMeasures = [];
        this.numbering = {};
        return this._super.apply(this, arguments);
    },
    _process_fields_view: function(fieldsView) {
        var self = this;
        fieldsView.arch.children.forEach(function (field) {
            var name = field.attrs.name;
            if (field.attrs.interval) {
                name += ':' + field.attrs.interval;
            }
            if (field.attrs.type === 'measure' || 'operator' in field.attrs) {
                self.initialMeasures.push(name);
            }
            if (field.attrs.type === 'col') {
                self.initialColGroupBys.push(name);
            }
            if (field.attrs.type === 'row') {
                self.initialRowGroupBys.push(name);
            }
        });
        if ((!this.initialMeasures.length) || fieldsView.arch.attrs.display_quantity) {
            this.initialMeasures.push('__count');
        }
        return this._super.call(this, fieldsView);
    },
    // not sure what to do, but this is necessary because the local js record
    // data has cycles and cause an error when cloned.  This method just prevent
    // the cloning from happening.  I guess the correct way to do would be to
    // refactor the internal data structure to avoid cycles, but this would take
    // too much time right now for a really small benefit.
    get: function(id) {
        if (!(id in this.local_data)) {
            return null;
        } else {
            return this.local_data[id];
        }
    },
    load: function(model, params) {
        if (!('fields' in params)) {
            params.fields = this.fields;
        }
        params.fields.__count = {string: _t("Count"), type: "integer"};

        var record = this._make_list(model, params);
        var groupedBy = params.grouped_by.length ? params.grouped_by : this.initialRowGroupBys;
        record.grouped_by = groupedBy;
        record.colGroupBys = params.colGroupBys || this.initialColGroupBys;
        record.measures = this.initialMeasures;
        record.sorted_column = {};
        return this._load_data(record);
    },
    reload: function(id) {
        var self = this;
        var record = this.local_data[id];
        var old_row_root = record.data.main_row.root;
        var old_col_root = record.data.main_col.root;

        return this._load_data(record).then(function() {
            self.update_tree(old_row_root, record.data.main_row.root);
            var new_groupby_length = get_header_depth(record.data.main_row.root) - 1;
            record.data.main_row.groupbys = old_row_root.groupbys.slice(0, new_groupby_length);

            self.update_tree(old_col_root, record.data.main_col.root);
            new_groupby_length = get_header_depth(record.data.main_col.root) - 1;
            record.data.main_row.groupbys = old_col_root.groupbys.slice(0, new_groupby_length);
            return record.id;
        });
    },
    update_tree: function (old_tree, new_tree) {
        if (!old_tree.expanded) {
            new_tree.expanded = false;
            new_tree.children = [];
            return;
        }
        var tree, j, old_title, new_title;
        for (var i = 0; i < new_tree.children.length; i++) {
            tree = undefined;
            new_title = new_tree.children[i].path[new_tree.children[i].path.length - 1];
            for (j = 0; j < old_tree.children.length; j++) {
                old_title = old_tree.children[j].path[old_tree.children[j].path.length - 1];
                if (old_title === new_title) {
                    tree = old_tree.children[j];
                    break;
                }
            }
            if (tree) this.update_tree(tree, new_tree.children[i]);
            else {
                new_tree.children[i].expanded = false;
                new_tree.children[i].children = [];
            }
        }
    },
    set_group_by: function(listId, groupBy) {
        if (!groupBy.length) {
            groupBy = this.initialRowGroupBys;
        }
        return this._super(listId, groupBy);
    },
    flip: function(id) {
        var record = this.local_data[id];

        // swap the data: the main column and the main row
        var temp = record.data.main_col;
        record.data.main_col = record.data.main_row;
        record.data.main_row = temp;

        // we need to update the record metadata: row and col groupBys
        temp = record.grouped_by;
        record.grouped_by = record.colGroupBys;
        record.colGroupBys = temp;

        return $.when(id);
    },
    toggle_measure: function(id, field) {
        var record = this.local_data[id];
        if (_.contains(record.measures, field)) {
            record.measures = _.without(record.measures, field);
        } else {
            record.measures.push(field);
        }
        return this._load_data(record);
    },
    sort_rows: function (id, col_id, measure, descending) {
        var record = this.local_data[id];

        traverse_tree(record.data.main_row.root, function (header) { 
            header.children.sort(compare);
        });
        record.sorted_column = {
            id: col_id,
            measure: measure,
            order: descending ? 'desc' : 'asc',
        };
        function get_value (id1, id2) {
            if ((id1 in record.data.cells) && (id2 in record.data.cells[id1])) {
                return record.data.cells[id1][id2];
            }
            if (id2 in record.data.cells) return record.data.cells[id2][id1];
        }

        function compare (row1, row2) {
            var values1 = get_value(row1.id, col_id),
                values2 = get_value(row2.id, col_id),
                value1 = values1 ? values1[measure] : 0,
                value2 = values2 ? values2[measure] : 0;
            return descending ? value1 - value2 : value2 - value1;
        }
        return $.when(id);
    },
    expand_header: function(id, header, field) {
        var self = this;
        var record = this.local_data[id];

        var other_root = header.root.other_root;
        var other_groupbys = header.root.other_root.groupbys;
        var fields = [].concat(field, other_groupbys, record.measures);
        var groupbys = [];

        for (var i = 0; i <= other_groupbys.length; i++) {
            groupbys.push([field].concat(other_groupbys.slice(0,i)));
        }

        return $.when.apply(null, groupbys.map(function (groupBy) {
            return self.perform_model_rpc(record.model, 'read_group', [], {
                context: record.context,
                domain: header.domain.length ? header.domain : record.domain,
                fields: fields,
                groupby: groupBy,
                lazy: false,
            });
        })).then(function () {
            var data = Array.prototype.slice.call(arguments);
            var datapt, attrs, j, k, l, row, col, cell_value, groupBys;
            for (i = 0; i < data.length; i++) {
                for (j = 0; j < data[i].length; j++){
                    datapt = data[i][j];
                    groupBys = [field].concat(other_groupbys.slice(0,i));
                    attrs = {
                        value: self.get_value(datapt, groupBys),
                        domain: datapt.__domain || [],
                        length: datapt.__count,
                    };

                    if (i === 0) {
                        row = self.make_header(record, attrs.value, attrs.domain, header.root, 0, 1, header);
                    } else {
                        row = self.get_header(attrs.value, header.root, 0, 1, header);
                    }
                    col = self.get_header(attrs.value, other_root, 1, i + 1);
                    if (!col) {
                        continue;
                    }
                    for (cell_value = {}, l=0; l < record.measures.length; l++) {
                        cell_value[record.measures[l]] = datapt[record.measures[l]];
                    }
                    // cell_value.__count = attrs.length;
                    if (!record.data.cells[row.id]) {
                        record.data.cells[row.id] = [];
                    }
                    record.data.cells[row.id][col.id] = cell_value;
                }
            }
            if (!_.contains(header.root.groupbys, field)) {
                header.root.groupbys.push(field);
            }
            return record.id;
        });
    },
    expand_all: function(id) {
        var record = this.local_data[id];
        return this._load_data(record);
    },
    close_header: function(id, header_id) {
        var record = this.local_data[id];
        var header = record.data.headers[header_id];
        header.expanded = false;
        header.children = [];
        var new_groupby_length = get_header_depth(header.root) - 1;
        header.root.groupbys.splice(new_groupby_length);
        return $.when(id);
    },
    // returns a deferred that resolve when the data is loaded.
    _load_data: function (record) {
        var self = this;
        var groupBys = [];
        var rowGroupBys = record.grouped_by;
        var colGroupBys = record.colGroupBys;
        var fields = [].concat(rowGroupBys, colGroupBys, record.measures);

        for (var i = 0; i < rowGroupBys.length + 1; i++) {
            for (var j = 0; j < colGroupBys.length + 1; j++) {
                groupBys.push(rowGroupBys.slice(0,i).concat(colGroupBys.slice(0,j)));
            }
        }

        return $.when.apply(null, groupBys.map(function (groupBy) {
            return self.perform_model_rpc(record.model, 'read_group', [], {
                context: record.context,
                domain: record.domain,
                fields: fields,
                groupby: groupBy,
                lazy: false,
            });
        })).then(function () {
            var data = Array.prototype.slice.call(arguments);
            self.prepare_data(record, data);
        }).then(function() {
            return record.id;
        });
    },
    get_value: function(datapt, fields) {
        var result = [];
        var value;
        for (var i = 0; i < fields.length; i++) {
            value = this.sanitize_value(datapt[fields[i]],fields[i]);
            result.push(value);
        }
        return result;
    },
    prepare_data: function (record, data) {
        var self = this;
        record.data = {
            main_row: {},
            main_col: {},
            headers: {},
            cells: [],
        };

        var index = 0;
        var rowGroupBys = record.grouped_by;
        var colGroupBys = record.colGroupBys;
        var datapt, row, col, attrs, cell_value;
        var main_row_header, main_col_header;
        var groupBys;
        var m;


        for (var i = 0; i < rowGroupBys.length + 1; i++) {
            for (var j = 0; j < colGroupBys.length + 1; j++) {
                for (var k = 0; k < data[index].length; k++) {
                    datapt = data[index][k];
                    groupBys = rowGroupBys.slice(0,i).concat(colGroupBys.slice(0,j));
                    attrs = {
                        value: self.get_value(datapt, groupBys),
                        domain: datapt.__domain || [],
                        length: datapt.__count,
                    };

                    if (j === 0) {
                        row = this.make_header(record, attrs.value, attrs.domain, main_row_header, 0, i);
                    } else {
                        row = this.get_header(attrs.value, main_row_header, 0, i);
                    }
                    if (i === 0) {
                        col = this.make_header(record, attrs.value, attrs.domain, main_col_header, i, i+j);
                    } else {
                        col = this.get_header(attrs.value, main_col_header, i, i+j);
                    }
                    if (i + j === 0) {
                        record.has_data = attrs.length > 0;
                        main_row_header = row;
                        main_col_header = col;
                    }
                    if (!record.data.cells[row.id]) record.data.cells[row.id] = [];
                    for (cell_value = {}, m=0; m < record.measures.length; m++) {
                        cell_value[record.measures[m]] = datapt[record.measures[m]];
                    }
                    record.data.cells[row.id][col.id] = cell_value;
                }
                index++;
            }
        }

        record.data.main_row.groupbys = rowGroupBys;
        record.data.main_col.groupbys = colGroupBys;

        main_row_header.other_root = main_col_header;
        main_col_header.other_root = main_row_header;

        main_row_header.groupbys = rowGroupBys;
        main_col_header.groupbys = colGroupBys;

        record.data.main_row.root = main_row_header;
        record.data.main_col.root = main_col_header;
    },
    make_header: function (record, value, domain, root, i, j, parent_header) {
        var total = _t("Total");
        var title = value.length ? value[value.length - 1] : total;
        var path, parent;
        if (parent_header) {
            path = parent_header.path.concat(title);
            parent = parent_header;
        } else {
            path = [total].concat(value.slice(i,j-1));
            parent = value.length ? find_path_in_tree(root, path) : null;
        }
        var header = {
            id: utils.generate_id(),
            expanded: false,
            domain: domain || [],
            children: [],
            path: value.length ? parent.path.concat(title) : [title]
        };
        record.data.headers[header.id] = header;
        header.root = root || header;
        if (parent) {
            parent.children.push(header);
            parent.expanded = true;
        }
        return header;
    },
    get_header: function (value, root, i, j, parent) {
        var path;
        var total = _t("Total");
        if (parent) {
            path = parent.path.concat(value.slice(i,j));
        } else {
            path = [total].concat(value.slice(i,j));
        }
        return find_path_in_tree(root, path);
    },
    
    sanitize_value: function (value, field) {
        if (value === false) {
            return _t("Undefined");
        }
        if (value instanceof Array) {
            return this.get_numbered_value(value, field);
        }
        if (field && this.fields[field] && (this.fields[field].type === 'selection')) {
            var selected = _.where(this.fields[field].selection, {0: value})[0];
            return selected ? selected[1] : value;
        }
        return value;
    },
    get_numbered_value: function(value, field) {
        var id= value[0];
        var name= value[1];
        this.numbering[field] = this.numbering[field] || {};
        this.numbering[field][name] = this.numbering[field][name] || {};
        var numbers = this.numbering[field][name];
        numbers[id] = numbers[id] || _.size(numbers) + 1;
        return name + (numbers[id] > 1 ? "  (" + numbers[id] + ")" : "");
    },
});

});
