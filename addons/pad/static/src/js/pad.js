odoo.define('pad.pad', function (require) {

var core = require('web.core');
var form_common = require('web.form_common');

var _t = core._t;

var FieldPad = form_common.AbstractField.extend(form_common.ReinitializeWidgetMixin, {
    template: 'FieldPad',
    content: "",
    init: function() {
        var self = this;
        this._super.apply(this, arguments);
        this._configured_deferred = this.view.dataset.call('pad_is_configured').then(function(data) {
            self.set("configured", !!data);
        }).fail(function(data, event) {
            event.preventDefault();
            self.set("configured", true);
        });
        this._pad_loading_deferred = null;
    },
    initialize_content: function() {
        var self = this;
        this.$('.oe_pad_switch').click(function() {
            self.$el.toggleClass('oe_pad_fullscreen');
            self.$el.find('.oe_pad_switch').toggleClass('fa-expand fa-compress');
            self.view.$el.find('.oe_chatter').toggle();
            $('#oe_main_menu_navbar').toggle();
        });
        this._configured_deferred.always(function() {
            var configured = self.get('configured');
            self.$(".oe_unconfigured").toggle(!configured);
            self.$(".oe_configured").toggle(configured);
        });
        this.render_value();
    },
    render_value: function() {
        var self = this;
        $.when(this._configured_deferred).always(function() {
            if (!self.get('configured')){
                return;
            }

            // reject possibly ongoing pad deferred
            if (self._pad_loading_deferred !== null) {
                self._pad_loading_deferred.reject();
                self.$('.oe_pad_content').text('');
                self._pad_deferred = null;
            }
            self._pad_loading_deferred = $.Deferred();
            var loading_def = self._pad_loading_deferred;

            var value = self.get('value');
            if (self.get('effective_readonly')) {
                if (_.str.startsWith(value, 'http')) {
                    self.view.dataset.call('pad_get_content', {url: value}).then(loading_def.resolve, loading_def.reject);
                    loading_def.done(function(data) {
                        self.$('.oe_pad_content').removeClass('oe_pad_loading').html('<div class="oe_pad_readonly"><div>');
                        self.$('.oe_pad_readonly').html(data);
                    }).fail(function() {
                        self.$('.oe_pad_content').text(_t('Unable to load pad'));
                    });
                } else {
                    self.$('.oe_pad_content').addClass('oe_pad_loading').show().text(_t("This pad will be initialized on first edit"));
                }
            }
            else {
                if (! value || !_.str.startsWith(value, 'http')) {
                    $.when(
                        self.view.dataset.call('pad_generate_url', {
                            context: {
                                model: self.view.model,
                                field_name: self.name,
                                object_id: self.view.datarecord.id
                            }
                        }),
                        // change record only after view has fully loaded it
                        self.view.record_loaded
                    ).then(function(data) {
                        // use defer to be after push_state (which happen after record_loaded)
                        _.defer(function(){
                            if (loading_def.state() === 'pending') {
                                if (! data.url) {
                                    self.set("configured", false);
                                } else {
                                    self.internal_set_value(data.url);
                                }
                                loading_def.resolve();
                            }
                        });
                    });
                } else {
                    loading_def.resolve();
                }
                loading_def.then(function() {
                    value = self.get('value');
                    if (_.str.startsWith(value, 'http')) {
                        var content = '<iframe width="100%" height="100%" frameborder="0" src="' + value + '?showChat=false&userName=' + encodeURIComponent(self.session.username) + '"></iframe>';
                        self.$('.oe_pad_content').html(content);
                        self._dirty_flag = true;
                    }
                    else {
                        self.$('.oe_pad_content').text(value);
                    }
                });
            }
        });
    },
});

core.form_widget_registry.add('pad', FieldPad);

});
