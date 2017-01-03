odoo.define('website_mail.thread', function(require) {
    'use strict';

    var web_editor_base = require('web_editor.base');
    var ajax = require('web.ajax');
    var core = require('web.core');
    var Widget = require('web.Widget');

    var qweb = core.qweb;
    var _t = core._t;

    /**
     * Widget WebsiteMailThread
     *
     *  - Fetch message fron controller
     *  - Display chatter: pager, total message, composer (according to access right)
     *  - Provider API to filter displayed messages
     */
    var WebsiteMailThread = Widget.extend({
        template: 'website_mail.chatter',
        events: {
            "click .o_website_mail_pager_btn": 'on_click_pager'
        },

        init: function(parent, options){
            this._super.apply(this, arguments);
            this.options = _.defaults(options || {}, {
                'allow_composer': true,
                'display_composer': false,
                'csrf_token': odoo.csrf_token,
                'message_count': 0,
                'pager_step': 10,
                'pager_scope': 5,
                'pager_start': 1,
                'is_user_public': true,
                'is_user_publisher': false,
                'domain': [],
            });
            this.set('messages', []);
            this.set('message_count', this.options['message_count']);
            this.set('pager', {});
            this.set('domain', this.options['domain']);
            this._current_page = this.options['pager_start'];
        },
        willStart: function(){
            var self = this;
            // load qweb template and init data
            return $.when(
                ajax.jsonRpc('/website_mail/init', 'call', this._message_fetch_prepare_params()),
                this._load_templates()
            ).then(function(result){
                // bind events
                self.on("change:messages", self, self.render_messages);
                self.on("change:message_count", self, function(){
                    self.render_message_count();
                    self.set('pager', self._pager(self._current_page));
                });
                self.on("change:pager", self, self.render_pager);
                self.on("change:domain", self, self.on_change_domain);
                // set options and parameters
                self.options = _.extend(self.options, result['options'] || {});
                self.set('message_count', self.options['message_count']);
                self.set('messages', self.preprocess_messages(result['messages']));
                return result;
            });
        },
        _load_templates: function(){
            return ajax.loadXML('/website_mail/static/src/xml/website_mail.xml', qweb);
        },
        message_fetch: function(domain){
            var self = this;
            return ajax.jsonRpc('/website_mail/fetch', 'call', this._message_fetch_prepare_params()).then(function(result){
                self.set('messages', self.preprocess_messages(result['messages']));
                self.set('message_count', result['message_count']);
            });
        },
        _message_fetch_prepare_params: function(){
            var self = this;
            var data = {
                'res_model': this.options['res_model'],
                'res_id': this.options['res_id'],
                'limit': this.options['pager_step'],
                'offset': (this._current_page-1) * this.options['pager_step'],
                'allow_composer': this.options['allow_composer'],
            }
            // add fields to allow to post comment without being logged
            _.each(['token', 'token_field'], function(field){
                if(self.options[field]){
                    data[field] = self.options[field];
                }
            });
            // add domain
            if(this.get('domain')){
                data['domain'] = this.get('domain');
            }
            return data;
        },
        preprocess_messages: function(messages){
            _.each(messages, function(m){
                m['author_avatar_url'] = _.str.sprintf('/web/image/%s/%s/author_avatar/50x50', 'mail.message', m.id);
                m['published_date_str'] = _.str.sprintf(_t('Published on %s'), moment(m.date).format('MMMM Do YYYY, h:mm:ss a'));
            });
            return messages;
        },
        _pager: function(page){
            var page = page || 1;
            var total = this.get('message_count');
            var scope = this.options['pager_scope'];
            var step = this.options['pager_step'];

            // Compute Pager
            var page_count = parseInt(Math.ceil(parseFloat(total) / step));

            var page = Math.max(1, Math.min(parseInt(page), page_count));
            scope -= 1;

            var pmin = Math.max(page - parseInt(Math.floor(scope/2)), 1);
            var pmax = Math.min(pmin + scope, page_count);

            if(pmax - pmin < scope){
                if(pmax - scope > 0){
                    pmin = pmax - scope;
                }else{
                    pmin = 1;
                }
            }
            var pages = [];
            _.each(_.range(pmin, pmax+1), function(index){
                pages.push(index);
            });

            return {
                "page_count": page_count,
                "offset": (page - 1) * step,
                "page": page,
                "page_start": pmin,
                "page_previous": Math.max(pmin, page - 1),
                "page_next": Math.min(pmax, page + 1),
                "page_end": pmax,
                "pages": pages
            }
        },
        // events / actions
        change_current_page: function(page, domain){
            this._current_page = page;
            var d = _.clone(this.get('domain'))
            if(domain){
                d = domain;
            }
            this.set('domain', d); // trigger fetch message
        },
        on_change_domain: function(){
            var self = this;
            this.message_fetch().then(function(){
                var p = self._current_page;
                self.set('pager', self._pager(p));
            });
        },
        on_click_pager: function(ev){
            ev.preventDefault();
            var page = $(ev.currentTarget).data('page');
            this.change_current_page(page);
        },
        // ui
        render_messages: function(){
            this.$('.o_website_mail_messages').html(qweb.render("website_mail.chatter_messages", {widget: this}));
        },
        render_message_count: function(){
            this.$('.o_message_counter').replaceWith(qweb.render("website_mail.chatter_message_count", {widget: this}));
        },
        render_pager: function(){
            this.$('.o_website_mail_pager').replaceWith(qweb.render("website_mail.pager", {widget: this}));
        },
    });

    web_editor_base.ready().then(function(){
        $('.o_website_mail_thread').each(function(index){
            var $elem = $(this);
            var mail_thread = new WebsiteMailThread($elem, $elem.data());
            mail_thread.appendTo($elem);
        });
    });

    return {
        WebsiteMailThread: WebsiteMailThread,
    }
});
