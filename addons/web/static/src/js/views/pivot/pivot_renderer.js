odoo.define('web.PivotRenderer', function (require) {
"use strict";

var AbstractRenderer = require('web.AbstractRenderer');
var field_utils = require('web.field_utils');

function traverse_tree(root, f, arg1, arg2, arg3) {
    f(root, arg1, arg2, arg3);
    if (!root.expanded) return;
    for (var i = 0; i < root.children.length; i++) {
        traverse_tree(root.children[i], f, arg1, arg2, arg3);
    }
}


return AbstractRenderer.extend({
    tagName: 'table',
    className: 'table-hover table-condensed table-bordered',

    _render: function () {
        var $fragment = $(document.createDocumentFragment());
        var $table = $('<table>').appendTo($fragment);
        var $thead = $('<thead>').appendTo($table);
        var $tbody = $('<tbody>').appendTo($table);
        var headers = this.compute_headers();
        var rows = this.compute_rows();
        var nbr_measures = this.state.measures.length;
        var nbr_cols = (this.state.data.main_col.width === 1) ?
            nbr_measures :
            (this.state.data.main_col.width + 1) * nbr_measures;
        for (var i=0; i < nbr_cols + 1; i++) {
            $table.prepend($('<col>'));
        }
        this.draw_headers($thead, headers);
        this.draw_rows($tbody, rows);
        $table.on('hover', 'td', function () {
            $table.find('col:eq(' + $(this).index()+')').toggleClass('hover');
        });
        // todo: make sure the next line does something
        $table.find('.o_pivot_header_cell_opened,.o_pivot_header_cell_closed').tooltip();
        this.$el.html($table.contents());
    },
    draw_headers: function ($thead, headers) {
        var self = this;
        var i, j, cell, $row, $cell;

        var groupby_labels = _.map(this.state.data.main_col.groupbys, function (gb) {
            return self.state.fields[gb.split(':')[0]].string;
        });

        for (i = 0; i < headers.length; i++) {
            $row = $('<tr>');
            for (j = 0; j < headers[i].length; j++) {
                cell = headers[i][j];
                $cell = $('<th>')
                    .text(cell.title)
                    .attr('rowspan', cell.height)
                    .attr('colspan', cell.width);
                if (i > 0) {
                    $cell.attr('title', groupby_labels[i-1]);
                }
                if (cell.expanded !== undefined) {
                    $cell.addClass(cell.expanded ? 'o_pivot_header_cell_opened' : 'o_pivot_header_cell_closed');
                    $cell.data('id', cell.id);
                }
                if (cell.measure) {
                    $cell.addClass('o_pivot_measure_row text-muted')
                        .text(this.state.fields[cell.measure].string);
                    $cell.data('id', cell.id).data('measure', cell.measure);
                    if (cell.id === this.state.sorted_column.id && cell.measure === this.state.sorted_column.measure) {
                        $cell.addClass('o_pivot_measure_row_sorted_' + this.state.sorted_column.order);
                    }
                }
                $row.append($cell);

                $cell.toggleClass('hidden-xs', (cell.expanded !== undefined) || (cell.measure !== undefined && j < headers[i].length - this.state.measures.length));
                if (cell.height > 1) {
                    $cell.css('padding', 0);
                }
            }
            $thead.append($row);
        }
    },
    draw_rows: function ($tbody, rows) {
        var self = this;
        var i, j, value, measure, name, $row, $cell, $header;
        var nbr_measures = this.state.measures.length;
        var length = rows[0].values.length;
        var display_total = this.state.data.main_col.width > 1;

        var groupby_labels = _.map(this.state.data.main_row.groupbys, function (gb) {
            return self.state.fields[gb.split(':')[0]].string;
        });
        var measure_types = this.state.measures.map(function (name) {
            return self.state.fields[name].type;
        });
        for (i = 0; i < rows.length; i++) {
            $row = $('<tr>');
            $header = $('<td>')
                .text(rows[i].title)
                .data('id', rows[i].id)
                .css('padding-left', (5 + rows[i].indent * 30) + 'px')
                .addClass(rows[i].expanded ? 'o_pivot_header_cell_opened' : 'o_pivot_header_cell_closed');
            if (rows[i].indent > 0) $header.attr('title', groupby_labels[rows[i].indent - 1]);
            $header.appendTo($row);
            for (j = 0; j < length; j++) {
                value = rows[i].values[j];
                if (value !== undefined) {
                    name = this.state.measures[j % nbr_measures];
                    measure = this.state.fields[name];
                    value = field_utils['format_' + measure_types[j % nbr_measures]](value, measure);
                }
                $cell = $('<td>')
                            .data('id', rows[i].id)
                            .data('col_id', rows[i].col_ids[Math.floor(j / nbr_measures)])
                            .toggleClass('o_empty', !value)
                            .text(value)
                            .addClass('o_pivot_cell_value text-right');
                if (((j >= length - this.state.measures.length) && display_total) || i === 0){
                    $cell.css('font-weight', 'bold');
                }
                $row.append($cell);

                $cell.toggleClass('hidden-xs', j < length - nbr_measures);
            }
            $tbody.append($row);
        }
    },
    compute_headers: function () {
        var self = this;
        var main_col_dims = this.get_header_width_depth(this.state.data.main_col.root);
        var depth = main_col_dims.depth;
        var width = main_col_dims.width;
        var nbr_measures = this.state.measures.length;
        var result = [[{width:1, height: depth + 1}]];
        var col_ids = [];
        this.state.data.main_col.width = width;
        traverse_tree(this.state.data.main_col.root, function (header) {
            var index = header.path.length - 1;
            var cell = {
                    width: self.get_header_width(header) * nbr_measures,
                    height: header.expanded ? 1 : depth - index,
                    title: header.path[header.path.length-1],
                    id: header.id,
                    expanded: header.expanded,
                };
            if (!header.expanded) col_ids.push(header.id);
            if (result[index]) result[index].push(cell);
            else result[index] = [cell];
        });
        col_ids.push(this.state.data.main_col.root.id);
        this.state.data.main_col.width = width;
        if (width > 1) {
            var total_cell = {width:nbr_measures, height: depth, title:""};
            if (nbr_measures === 1) {
                total_cell.total = true;
            }
            result[0].push(total_cell);
        }
        var nbr_cols = width === 1 ? nbr_measures : (width + 1)*nbr_measures;
        for (var i = 0, measure_row = [], measure; i < nbr_cols; i++) {
            measure = this.state.measures[i % nbr_measures];
            measure_row.push({
                measure: measure,
                is_bold: (width > 1) && (i >= nbr_measures*width),
                id: col_ids[Math.floor(i / nbr_measures)],
            });
        }
        result.push(measure_row);
        return result;
    },
    get_header_width: function (header) {
        var self = this;
        if (!header.children.length) return 1;
        if (!header.expanded) return 1;
        return header.children.reduce(function (s, c) {
            return s + self.get_header_width(c);
        }, 0);
    },
    get_header_width_depth: function (header) {
        var depth = 1;
        var width = 0;
        traverse_tree (header, function (hdr) {
            depth = Math.max(depth, hdr.path.length);
            if (!hdr.expanded) width++;
        });
        return {width: width, depth: depth};
    },
    compute_rows: function () {
        var self = this;
        var aggregates, i;
        var result = [];
        traverse_tree(this.state.data.main_row.root, function (header) {
            var values = [],
                col_ids = [];
            result.push({
                id: header.id,
                col_ids: col_ids,
                indent: header.path.length - 1,
                title: header.path[header.path.length-1],
                expanded: header.expanded,
                values: values,
            });
            traverse_tree(self.state.data.main_col.root, add_cells, header.id, values, col_ids);
            if (self.state.data.main_col.width > 1) {
                aggregates = self.get_value(header.id, self.state.data.main_col.root.id);
                for (i = 0; i < self.state.measures.length; i++) {
                    values.push(aggregates && aggregates[self.state.measures[i]]);
                }
                col_ids.push( self.state.data.main_col.root.id);
            }
        });
        return result;
        function add_cells (col_hdr, row_id, values, col_ids) {
            if (col_hdr.expanded) return;
            col_ids.push(col_hdr.id);
            aggregates = self.get_value(row_id, col_hdr.id);
            for (i = 0; i < self.state.measures.length; i++) {
                values.push(aggregates && aggregates[self.state.measures[i]]);
            }
        }
    },
    get_value: function (id1, id2) {
        if ((id1 in this.state.data.cells) && (id2 in this.state.data.cells[id1])) {
            return this.state.data.cells[id1][id2];
        }
        if (id2 in this.state.data.cells) return this.state.data.cells[id2][id1];
    },
});

});
