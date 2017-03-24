odoo.define('website_sale.editor', function (require) {
"use strict";

var ajax = require('web.ajax');
var core = require('web.core');
var Model = require('web.Model');
var contentMenu = require('website.contentMenu');
var options = require('web_editor.snippets.options');

var website = require('website.website');
var rte = require('web_editor.rte');

var _t = core._t;

contentMenu.TopBar.include({
    new_product: function() {
        website.prompt({
            id: "editor_new_product",
            window_title: _t("New Product"),
            input: "Product Name",
        }).then(function (name) {
            website.form('/shop/add_product', 'POST', {
                name: name
            });
        });
    },
});

if(!$('.js_sale').length) {
    return $.Deferred().reject("DOM doesn't contain '.js_sale'");
}

options.registry.website_sale = options.Class.extend({
    start: function () {
        var self = this;
        this.product_tmpl_id = parseInt(this.$target.find('[data-oe-model="product.template"]').data('oe-id'));

        var size_x = parseInt(this.$target.attr("colspan") || 1);
        var size_y = parseInt(this.$target.attr("rowspan") || 1);

        var $size = this.$el.find('ul[name="size"]');
        var $select = $size.find('tr:eq(0) td:lt('+size_x+')');
        if (size_y >= 2) $select = $select.add($size.find('tr:eq(1) td:lt('+size_x+')'));
        if (size_y >= 3) $select = $select.add($size.find('tr:eq(2) td:lt('+size_x+')'));
        if (size_y >= 4) $select = $select.add($size.find('tr:eq(3) td:lt('+size_x+')'));
        $select.addClass("selected");

        new Model('product.style')
            .call('search_read', [[]])
                .then(function (data) {
                    var $ul = self.$el.find('ul[name="style"]');
                    for (var k in data) {
                        $ul.append(
                            $('<li data-style="'+data[k]['id']+'" data-toggle_class="'+data[k]['html_class']+'"/>')
                                .append( $('<a/>').text(data[k]['name']) ));
                    }
                    self.set_active();
                });
        this.$overlay.find('.oe_handle.w').removeClass('readonly').addClass('ui-resizable-handle ui-resizable-w');
        this.$overlay.find('.oe_handle.e').removeClass('readonly').addClass('ui-resizable-handle ui-resizable-e');
        this.$overlay.find('.oe_handle.n').removeClass('readonly').addClass('ui-resizable-handle ui-resizable-n');
        this.$overlay.find('.oe_handle.s').removeClass('readonly').addClass('ui-resizable-handle ui-resizable-s');
        this.bind_drag_and_drop_product();
        this.bind_drag_resize_product();
        this.bind_resize();
    },
    reload: function () {
        if (location.href.match(/\?enable_editor/)) {
            location.reload();
        } else {
            location.href = location.href.replace(/\?(enable_editor=1&)?|#.*|$/, '?enable_editor=1&');
        }
    },
    bind_resize: function () {
        var self = this;
        this.$el.on('mouseenter', 'ul[name="size"] table', function (event) {
            $(event.currentTarget).addClass("oe_hover");
        });
        this.$el.on('mouseleave', 'ul[name="size"] table', function (event) {
            $(event.currentTarget).removeClass("oe_hover");
        });
        this.$el.on('mouseover', 'ul[name="size"] td', function (event) {
            var $td = $(event.currentTarget);
            var $table = $td.closest("table");
            var x = $td.index()+1;
            var y = $td.parent().index()+1;

            var tr = [];
            for (var yi=0; yi<y; yi++) tr.push("tr:eq("+yi+")");
            var $select_tr = $table.find(tr.join(","));
            var td = [];
            for (var xi=0; xi<x; xi++) td.push("td:eq("+xi+")");
            var $select_td = $select_tr.find(td.join(","));

            $table.find("td").removeClass("select");
            $select_td.addClass("select");
        });
        this.$el.on('click', 'ul[name="size"] td', function (event) {
            var $td = $(event.currentTarget);
            var x = $td.index()+1;
            var y = $td.parent().index()+1;
            ajax.jsonRpc('/shop/change_size', 'call', {'id': self.product_tmpl_id, 'x': x, 'y': y})
                .then(self.reload);
        });
    },
    style: function (type, value, $li) {
        if(type !== "click") return;
        ajax.jsonRpc('/shop/change_styles', 'call', {'id': this.product_tmpl_id, 'style_id': value});
    },
    go_to: function (type, value) {
        var self = this;
        if(type !== "click") return;
        ajax.jsonRpc('/shop/change_sequence/' + this.product_tmpl_id, 'call', {'sequence': value})
            .done(function(result) {
                $('#product_table').replaceWith(result.template);
                $('.oe_overlay').detach();
                self.rebind_event();
        });
    },
    rebind_event: function(){
        this.rte = new rte.Class(this.editor);
        this.rte.start();
    },
    bind_drag_and_drop_product: function(){
        var self = this;
        var startx, starty, stopx, stopy, direction, target_product_sequence, dragged_product_sequence, target_product_id;
        var is_dragged = false;
        this.$target.draggable({
            helper: 'original',
            revert: function() {
                $('div.oe_product_cart[data-publish=on]').children('.oe_drop_zone').addClass('hidden');
                return true;
            },
            revertDuration: 200,
            drag: function(event) {
                self.$target.next('td.oe_product.oe_grid').find('div.oe_drop_zone:not(.cloned_drop_zone)').addClass('hidden');
                self.$target.find('.cloned_drop_zone').addClass('hidden');
            },
            start: function(event, ui) {
                starty = event.pageY;
                startx = event.pageX;
                var $this = $('div.oe_product_cart[data-publish=on]').not(self.$target.find('div.oe_product_cart'));
                $this.each(function() {
                    $(this).find('.oe_drop_zone').not('.cloned_drop_zone').removeClass('hidden').css('height', $(this).height());
                });
                // var last_td = $('tr').find('td:last').has('div.oe_product_cart[data-publish=on]');
                var last_td = $('tr').find('td').has('div.oe_product_cart[data-publish=on]');
                var last_publish_td = $('td div.oe_product_cart[data-publish=off]').parents('td').prev('td').has('div.oe_product_cart[data-publish=on]');
                var all_last_td = $.merge(last_td,last_publish_td);
                if(all_last_td) {
                    all_last_td.each(function() {
                        $(this).find('.cloned_drop_zone').removeClass('hidden').css('height', $(this).height()).css('float','right');
                    })
                }
            },
            stop: function(event, ui) {
                stopx = event.pageX;
                stopy = event.pageY;
                direction = (starty > stopy && startx > stopx) ? "up" : "down";
                if (is_dragged) {
                    is_dragged = false;
                    ajax.jsonRpc('/shop/drag_drop_change_sequence/' + self.product_tmpl_id, 'call', {'sequence': target_product_sequence, 'direction': direction, 'dragged_product_sequence': dragged_product_sequence, 'target_product_id': target_product_id})
                        .done(function(result) {
                            $('#product_table').replaceWith(result.template);
                            $('.oe_overlay').detach();
                            self.rebind_event();
                        });
                }
            }
        });

        $(".oe_drop_zone").droppable({
            tolerance: 'pointer',
            drop: function(event, ui) {
                is_dragged = true;
                target_product_sequence = $(this).parents('td').data('sequence');
                dragged_product_sequence = self.$target.data('sequence');
                target_product_id = $(this).parents('td').data('id');
            },
        });
    },
    bind_drag_resize_product: function() {
        var self = this;
        var width = this.$target.parents('tr').width()/4;
        var height = this.$target.parents('tr').height();
        this.$target.resizable({
            containment: $('#product_table'),
            handles:{n: $(this.$overlay.find('.oe_handle.n')), e: $(this.$overlay.find('.oe_handle.e')), s: $(this.$overlay.find('.oe_handle.s')), w: $(this.$overlay.find('.oe_handle.w'))},
            helper: "ui-resizable-helper",
            grid: [width, height],
            stop: function(event, ui) {
                var colspan = Math.floor(ui.helper[0].clientWidth/Math.floor(width));
                var rowspan = Math.floor(ui.helper[0].clientHeight/Math.floor(height));
                if (colspan !== self.$target.prop("colspan") || rowspan !== self.$target.prop("rowspan")) {
                    ajax.jsonRpc('/shop/drag_and_drop_resize/' + self.product_tmpl_id, 'call', {'x': colspan, 'y': rowspan})
                        .done(function(result) {
                            $('#product_table').replaceWith(result.template);
                            $('.oe_overlay').detach();
                            self.rebind_event();
                        });
                } else {
                    $(this).prop("style", ""); // Bad fix to revert resize, there should be some api to revert resize
                }
            }
        });
    },
});

});
