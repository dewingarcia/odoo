# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.


from odoo import api, models


class MailComposeMessage(models.TransientModel):
    _inherit = 'mail.compose.message'

    @api.multi
    def send_mail(self, auto_commit=False):
        context = self._context
        cart_access_token = context.get('cart_access_token')
        if context.get('default_model') == 'sale.order' and cart_access_token:
            for order in self.env['sale.order'].browse(context.get('active_ids')):
                order.cart_access_token = cart_access_token.get('%s' % order.id)
            self = self.with_context(mail_post_autofollow=True)
        return super(MailComposeMessage, self).send_mail(auto_commit=auto_commit)
