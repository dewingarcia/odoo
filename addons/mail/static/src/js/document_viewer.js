odoo.define('mail.attachment.popup', function (require) {
"use strict";

    var Widget = require('web.Widget');

    var DocumentViewer = Widget.extend({
        template: "Attachment.Popup.Modal",

        init: function(thread){
            var attachment_ids = thread.get('attachment_ids');
            this.attachment_ids = _.filter(attachment_ids, function(attachment){
                var type = attachment.mimetype.split('/').shift();
                if (type == 'image' || type == 'video'){
                    return attachment.type = type
                }
            });
        },

        on_attachment_popup: function(attachment_id){
            this.active_attachment = _.findWhere(this.attachment_ids, {id: attachment_id});
            this.renderElement();
            // remove if modal in dom
            $('div#o_attacment_popup').remove();
            this.$el.modal('show');
            this.on_carousel_control(this.$el.find('.carousel'));
        },

        on_carousel_control: function(carousel_slide){
            var download_link = this.$el.find('div.o_attachment_download');
            carousel_slide.on('slide.bs.carousel', function (event){
                var $carousel_caption = $(event.relatedTarget).find('.carousel-caption').html();
                // set download link at proper place in modal
                download_link.html($carousel_caption);
            });
        },

    });
    return DocumentViewer;
});
