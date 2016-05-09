# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models, _
from odoo.exceptions import UserError


class MergeMassMailingList(models.TransientModel):
    _name = 'mail.merge_mass_mailing.list'
    _description = 'Merge Mass Mailing List'

    mailing_list_ids = fields.Many2many('mail.mass_mailing.list', string='Mass mail List')
    dst_massmail_list_id = fields.Many2one('mail.mass_mailing.list', string='Destination Mailing List')

    @api.model
    def default_get(self, fields):
        """
        Use active_ids from the context to fetch the mailing list to merge.
        """
        res = super(MergeMassMailingList, self).default_get(fields)
        if self.env.context.get('active_model') == 'mail.mass_mailing.list' and self.env.context.get('active_ids'):
            mailing_list_ids = self.env.context['active_ids']
            res['mailing_list_ids'] = mailing_list_ids
            res['dst_massmail_list_id'] = mailing_list_ids[0]
        return res

    @api.multi
    def action_massmail_merge(self):
        if not self.dst_massmail_list_id:
            raise UserError(_('Please select destination mailing list.'))
        self.dst_massmail_list_id.merge_massmail_list(self.mailing_list_ids)
        self.dst_massmail_list_id.delete_duplicate_contact()
