odoo.define('website_sale.backend', function (require) {
"use strict";

var ajax = require('web.ajax');
var WebsiteBackend = require('website.backendDashboard');

WebsiteBackend.include({

    events: _.defaults({
        'click tr.o_product_template': 'on_product_template',
        'click .js_utm_selector': 'render_utm_graph_type', // Click event on select UTM drop-down
    }, WebsiteBackend.prototype.events),

    init: function(parent, context) {
        this._super(parent, context);
        this.utm_type = 'campaign_id'; // set default utm_type to campaign_id
        this.btn_name = 'Campaigns'; // this.btn_name used to change the text value of button
        this.dashboards_templates.unshift('website_sale.dashboard_sales');
        this.graphs.push({'name': 'sales', 'group': 'sale_salesman'});
    },

    start: function() {
        this.fetch_graph_data();
        return this._super();
    },

    on_product_template: function(ev) {
        ev.preventDefault();

        var product_id = $(ev.currentTarget).data('productId');
        this.do_action({
            type: 'ir.actions.act_window',
            res_model: 'product.product',
            res_id: product_id,
            views: [[false, 'form']],
            target: 'current',
        }, {
            on_reverse_breadcrumb: this.on_reverse_breadcrumb,
        });
    },

    render_utm_graph_type: function(ev){
        ev.preventDefault();
        this.utm_type = $(ev.currentTarget).attr('name');
        this.btn_name = $(ev.currentTarget).text();
        this.fetch_graph_data();
    },

    fetch_graph_data: function(){
        var self = this;
        self.$("#utm_dropdown_btn").html(self.btn_name + '&nbsp;<span class="caret"></span>'); // drop-down button name
        return ajax.jsonRpc('/website/fetch_utm_data', 'call', {
            'utm_type': self.utm_type,
            'date_from': this.date_from.format('YYYY-MM-DD'),
            'date_to': this.date_to.format('YYYY-MM-DD'),
        }).done(function(result) {
            self.graph_data = result;
            if(result.length > 0){
                self.render_utm_graph('#o_graph_utm', self.graph_data);
            }
            else{
                self.render_noData_image('#o_graph_utm');
            }
        });
    },

    render_utm_graph: function(div_to_display, chart_values){
        this.$(div_to_display).empty();

        var self = this;
        nv.addGraph(function() {
            var chart2 = nv.models.pieChart()
                .x(function(d) { return d.utmtype; })
                .y(function(d) { return d.amount_total; })
                .showLabels(true)
                .labelThreshold(.05)
                .labelType("percent")
                .showLegend(false)
                .margin({"left":0,"right":0,"top":0,"bottom":0})
                .noData("No UTM Tag Detected");

        var svg = d3.select(div_to_display)
            .append("svg");

        svg
            .attr("height", '15em')
            .attr("width", '15em')
            .datum(chart_values)
            .call(chart2);

        nv.utils.windowResize(chart2.update);
        return chart2;
        });
    },

    render_noData_image: function(div_to_display){
        this.image_src = "website_sale/static/src/img/website_sale_dashboard_utms_demo.png";
        $('<img />', {
            src: this.image_src,
            alt: "There isn't any UTM tag detected in orders"
        }).addClass("o_image_chart").appendTo(this.$(div_to_display).empty());
    },

});

});
