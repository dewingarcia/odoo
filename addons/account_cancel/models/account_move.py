# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import models, api


class AccountMove(models.Model):
    _inherit = 'account.move'

    @api.multi
    def unlink(self):
        self.mapped('statement_line_id').mapped('statement_id').button_draft()
        return super(AccountMove, self).unlink()
