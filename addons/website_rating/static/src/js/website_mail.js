odoo.define('website_rating.thread', function(require) {
    'use strict';

    var ajax = require('web.ajax');
    var core = require('web.core');
    var Widget = require('web.Widget');

    var qweb = core.qweb;
    var _t = core._t;

    var WebsiteMailThread = require('website_mail.thread').WebsiteMailThread;

    /**
     * Extends Frontend Chatter to handle rating
     */
    WebsiteMailThread.include({
        events: _.extend({}, WebsiteMailThread.prototype.events, {
            "mousemove .stars i" : "star_move_on",
            "mouseleave .stars i" : "star_move_out",
            "click .stars" : "star_click_on",
            "mouseleave .stars" : "star_mouseleave",
            "click .o_website_rating_select": "onclick_star_domain",
            "click .o_website_rating_select_text": "onclick_star_domain_reset",
        }),

        init: function(parent, options){
            this._super.apply(this, arguments);
            // options
            if(!_.contains(this.options, 'display_rating')){
                this.options = _.defaults(this.options, {
                    'display_rating': false,
                    'rating_default_value': 0.0,
                });
            }
            // rating card
            this.set('rating_card_values', {});
            this.set('rating_value', false);
            this.on("change:rating_value", this, this.onchange_rating_domain_value);
            // rating star
            this.labels = {
                '0': "",
                '1': _t("I hate it"),
                '2': _t("I don't like it"),
                '3': _t("It's okay"),
                '4': _t("I like it"),
                '5': _t("I love it"),
            };
            this.user_click = false; // user has click or not
            this.set("star_value", this.options.rating_default_value);
            this.on("change:star_value", this, this.onchange_star_value);
        },
        willStart: function(){
            var self = this;
            return this._super.apply(this, arguments).then(function(result){
                // rating card
                if(result['rating_stats']){
                    var rating_data = {
                        'avg': self.round_to_half(result['rating_stats']['avg']),
                        'percent': [],
                    };
                    _.each(_.keys(result['rating_stats']['percent']), function(rating){
                        if(0 < rating && rating <= 5){
                            rating_data['percent'].push({
                                'num': rating,
                                'percent': result['rating_stats']['percent'][rating],
                            });
                        }
                    });
                    self.set('rating_card_values', rating_data);
                }
            });
        },
        start: function(){
            var self = this;
            return this._super.apply(this, arguments).then(function(){
                // rating stars
                self.$input = self.$('input[name="rating_value"]');
                self.$star_list = self.$('.stars').find('i');
                self.set("star_value", self.options.rating_default_value); // set the default value to trigger the display of star widget
            });
        },
        _load_templates: function(){
            return $.when(this._super(), ajax.loadXML('/website_rating/static/src/xml/website_mail.xml', qweb));
        },
        _message_fetch_prepare_params: function(){
            var params = this._super.apply(this, arguments);
            if(this.options['display_rating']){
                params['rating_include'] = true;
            }
            return params;
        },
        preprocess_messages: function(messages){
            var self = this;
            var messages = this._super.apply(this, arguments);
            if(this.options['display_rating']){
                _.each(messages, function(m){
                    m['rating_value'] = self.round_to_half(m['rating_value']);
                });
            }
            return messages;
        },
        // rating star input
        onchange_star_value: function(){
            var val = this.get("star_value");
            var index = Math.floor(val);
            var decimal = val - index;
            // reset the stars
            this.$star_list.removeClass('fa-star fa-star-half-o').addClass('fa-star-o');

            this.$('.stars').find("i:lt("+index+")").removeClass('fa-star-o fa-star-half-o').addClass('fa-star');
            if(decimal){
                this.$('.stars').find("i:eq("+(index)+")").removeClass('fa-star-o fa-star fa-star-half-o').addClass('fa-star-half-o');
            }
            this.$input.val(val);
            this.$('.rate_text .label').text(this.labels[index]);
        },
        star_move_out: function(){
            if(!this.user_click){
                this.set("star_value", 0);
            }
            this.user_click = false;
        },
        star_move_on: function(e){
            var index = this.$('.stars i').index(e.currentTarget);
            this.$('.rate_text').show();
            this.set("star_value", index+1);
        },
        star_click_on: function(e){
            this.user_click = true;
        },
        star_mouseleave: function(e){
            this.$('.rate_text').hide();
        },
        // star card domain
        onclick_star_domain: function(e){
            var $tr = this.$(e.currentTarget);
            var num = $tr.data('star');
            if($tr.css('opacity') == 1){
                this.set('rating_value', num);
                this.$('.o_website_rating_select').css({
                    'opacity': 0.5,
                });
                this.$('.o_website_rating_select_text[data-star="'+num+'"]').css({
                    'visibility': 'visible',
                    'opacity': 1,
                });
                this.$('.o_website_rating_select[data-star="'+num+'"]').css({
                    'opacity': 1,
                });
            }
        },
        onclick_star_domain_reset: function(e){
            e.stopPropagation();
            this.set('rating_value', false);
            this.$('.o_website_rating_select_text').css('visibility', 'hidden');
            this.$('.o_website_rating_select').css({
                'opacity': 1,
            });
        },
        onchange_rating_domain_value: function(){
            var domain = [];
            if(this.get('rating_value')){
                domain = [['rating_value', '=', this.get('rating_value')]];
            }
            this.change_current_page(1, domain);
        },
        // utils
        round_to_half: function(value) {
            var converted = parseFloat(value); // Make sure we have a number
            var decimal = (converted - parseInt(converted, 10));
            decimal = Math.round(decimal * 10);
            if(decimal == 5){
                return (parseInt(converted, 10)+0.5);
            }
            if((decimal < 3) || (decimal > 7)){
                return Math.round(converted);
            }else{
                return (parseInt(converted, 10)+0.5);
            }
        },
    });

});