odoo.define('mail.systray', function (require) {
"use strict";

var core = require('web.core');
var SystrayMenu = require('web.SystrayMenu');
var Widget = require('web.Widget');

var chat_manager = require('mail.chat_manager');

var QWeb = core.qweb;

var session = require('web.session');
var Model = require('web.Model')
var ActivityModel = new Model('mail.activity', session.user_context);
var activities = [];
var bus = require('bus.bus').bus;
var unread_activity_counter = 0;

/**
 * Menu item appended in the systray part of the navbar
 *
 * The menu item indicates the counter of needactions + unread messages in chat channels. When
 * clicking on it, it toggles a dropdown containing a preview of each pinned channels (except
 * static and mass mailing channels) with a quick link to open them in chat windows. It also
 * contains a direct link to the Inbox in Discuss.
 **/
var MessagingMenu = Widget.extend({
    template:'mail.chat.MessagingMenu',
    events: {
        "click": "on_click",
        "click .o_filter_button": "on_click_filter_button",
        "click .o_new_message": "on_click_new_message",
        "click .o_mail_channel_preview": "on_click_channel",
    },
    start: function () {
        this.$filter_buttons = this.$('.o_filter_button');
        this.$channels_preview = this.$('.o_mail_navbar_dropdown_channels');
        this.filter = false;
        chat_manager.bus.on("update_channel_unread_counter", this, this.update_counter);
        chat_manager.is_ready.then(this.update_counter.bind(this));
        return this._super();
    },
    is_open: function () {
        return this.$el.hasClass('open');
    },
    update_counter: function () {
        var counter = chat_manager.get_unread_conversation_counter();
        this.$('.o_notification_counter').text(counter);
        this.$el.toggleClass('o_no_notification', !counter);
        this.$el.toggleClass('o_unread_chat', !!chat_manager.get_chat_unread_counter());
        if (this.is_open()) {
            this.update_channels_preview();
        }
    },
    update_channels_preview: function () {
        var self = this;

        // Display spinner while waiting for channels preview
        this.$channels_preview.html(QWeb.render('Spinner'));

        chat_manager.is_ready.then(function () {
            var channels = _.filter(chat_manager.get_channels(), function (channel) {
                if (self.filter === 'chat') {
                    return channel.is_chat;
                } else if (self.filter === 'channels') {
                    return !channel.is_chat && channel.type !== 'static';
                } else {
                    return channel.type !== 'static';
                }
            });

            chat_manager.get_channels_preview(channels).then(self._render_channels_preview.bind(self));
        });
    },
    _render_channels_preview: function (channels_preview) {
        // Sort channels: 1. channels with unread messages, 2. chat, 3. by date of last msg
        channels_preview.sort(function (c1, c2) {
            return Math.min(1, c2.unread_counter) - Math.min(1, c1.unread_counter) ||
                   c2.is_chat - c1.is_chat ||
                   c2.last_message.date.diff(c1.last_message.date);
        });

        // Generate last message preview (inline message body and compute date to display)
        _.each(channels_preview, function (channel) {
            channel.last_message_preview = chat_manager.get_message_body_preview(channel.last_message.body);
            if (channel.last_message.date.isSame(new Date(), 'd')) {  // today
                channel.last_message_date = channel.last_message.date.format('LT');
            } else {
                channel.last_message_date = channel.last_message.date.format('lll');
            }
        });

        this.$channels_preview.html(QWeb.render('mail.chat.ChannelsPreview', {
            channels: channels_preview,
        }));
    },
    on_click: function () {
        if (!this.is_open()) {
            this.update_channels_preview();  // we are opening the dropdown so update its content
        }
    },
    on_click_filter_button: function (event) {
        event.stopPropagation();
        this.$filter_buttons.removeClass('o_selected');
        var $target = $(event.currentTarget);
        $target.addClass('o_selected');
        this.filter = $target.data('filter');
        this.update_channels_preview();
    },
    on_click_new_message: function () {
        chat_manager.bus.trigger('open_chat');
    },
    on_click_channel: function (event) {
        var channel_id = $(event.currentTarget).data('channel_id');
        var channel = chat_manager.get_channel(channel_id);
        if (channel) {
            chat_manager.open_channel(channel);
        }
    },
});

/**
 * Menu item appended in the systray part of the navbar, redirects to the next activities of all app
 */
var NextActivity = Widget.extend({
    template:'mail.chat.NextActivity',
    events: {
        "click": "on_click",
        "click .o_mail_channel_preview": "on_click_channel",
    },
    start: function () {
        this.$filter_buttons = this.$('.o_filter_button');
        this.$activities_preview = this.$('.o_mail_navbar_dropdown_channels');
        chat_manager.bus.on("activity_created", this, this.update_counter);
        chat_manager.is_ready.then(this.update_counter.bind(this));
        return this._super();
    },
    is_open: function () {
        return this.$el.hasClass('open');
    },
    update_counter: function () {
        this.get_activity_data();
        var counter = this.get_unread_activity_counter();
        this.$('.o_notification_counter').text(counter);
        this.update_activity_preview();
    },
    get_activity_data: function(){
        ActivityModel.query(['res_model', 'state', 'date_deadline', 'id', 'user_id']).filter([['user_id', '=', obj.id]]).all().then(function (activity_obj) {
        activities = activity_obj.concat();
        unread_activity_counter = activities.length;
        });
    }
    get_unread_activity_counter: function () {
        return unread_activity_counter;
    },
    get_activities: function () {
        return _.clone(activities);
    },
    get_activities_preview: function (activities) {
        var activities_preview = _.map(activities, function (activity) {
            var info = _.pick(activity, 'id', 'res_model', 'state', 'date_deadline');
            info.image_src = '/mail/static/src/img/smiley/avatar.jpg';
            return info;
        });
        return activities_preview;
    },
    update_activity_preview: function () {
        var self = this;

        // Display spinner while waiting for channels preview
        this.$activities_preview.html(QWeb.render('Spinner'));
        var activities = chat_manager.get_activities();
        var activities_preview = get_activities_preview(activities);
        this.$activities_preview.html(QWeb.render('mail.chat.NextActivityPreview', {
            activities : activities_preview
        }));
    },
    on_click: function () {
        if (!this.is_open()) {
            this.update_activity_preview();  // we are opening the dropdown so update its content
        }
    },
});

SystrayMenu.Items.push(MessagingMenu);
SystrayMenu.Items.push(NextActivity);

});
