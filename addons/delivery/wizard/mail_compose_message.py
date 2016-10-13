# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, models


class MailComposeMessage(models.TransientModel):
    _inherit = 'mail.compose.message'

    @api.multi
    def send_mail(self, auto_commit=False):
        if self.env.context.get('default_model') == 'stock.picking' and self.env.context.get('default_res_id') and self.env.context.get('mark_delivery_as_sent'):
            picking = self.env['stock.picking'].browse([self.env.context['default_res_id']])
            if picking.state == 'done':
            	picking.is_sent_delivery_mail = True
        return super(MailComposeMessage, self).send_mail(auto_commit=auto_commit)
