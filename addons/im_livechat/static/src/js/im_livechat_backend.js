odoo.define('im_livechat.chat_client_action', function (require) {
"use strict";

require('mail.chat_client_action');
var chat_manager = require('mail.chat_manager');
var core = require('web.core');

core.action_registry.get('mail.chat.instant_messaging').include({
    _render_sidebar: function (options) {
        // Override to sort livechat channels by last message's date
        var channel_partition = _.partition(options.channels, function (channel) {
            return channel.type === 'livechat';
        });
        channel_partition[0].sort(function (c1, c2) {
            return c2.last_message_date.diff(c1.last_message_date);
        });
        options.channels = channel_partition[0].concat(channel_partition[1]);
        return this._super(options);
    },
});

chat_manager.bus.on('new_message', null, function (msg) {
    _.each(msg.channel_ids, function (channel_id) {
        var channel = chat_manager.get_channel(channel_id);
        if (channel) {
            channel.last_message_date = msg.date; // update the last message's date of the channel
        }
    });
});

});

odoo.define('im_livechat.form_widgets', function (require) {
"use strict";

var core = require('web.core');

var FieldChar = core.form_widget_registry.get('char');
var FieldText = core.form_widget_registry.get('text');

var _t = core._t;
var QWeb = core.qweb;

var AbstractFieldCopyText = {
    events: {
        'click .o_clipboard_button': 'copy_text',
    },

    copy_text: function (event) {
        var self = this;
        var $clipboardBtn;
        var clipboard;
        $clipboardBtn = this.$('.o_clipboard_button');
        $clipboardBtn.tooltip({title: _t('Copied !'), trigger: 'manual', placement: 'right'});
        clipboard = new window.Clipboard('.o_clipboard_button', {
            text: function () {
                return self.get_copy_text();
            }
        });
        clipboard.on('success', function () {
            _.defer(function () {
                $clipboardBtn.tooltip('show');
                _.delay(function () {
                    $clipboardBtn.tooltip('destroy');
                }, 800);
            });
        });
    },
    get_copy_text: function () {
        return this.get('value').trim();
    }
};

var FieldCopyChar = FieldChar.extend(AbstractFieldCopyText, {
    render_value: function() {
        this._super.apply(this, arguments);
        this.$el.addClass('o_field_copy');
        this.$el.append($(QWeb.render('FieldCopyChar')));
    }
});

var FieldCopyText = FieldText.extend(AbstractFieldCopyText, {
    render_value: function() {
        this._super.apply(this, arguments);
        this.$el.addClass('o_field_copy');
        this.$el.append($(QWeb.render('FieldCopyText')));
    }
});

core.form_widget_registry
    .add('FieldCopyChar', FieldCopyChar)
    .add('FieldCopyText', FieldCopyText);
});
