# -*- coding: utf-8 -*-

from odoo import models, fields, api, _
from odoo.tools import float_round


class AccountRounding(models.Model):
    """
    In some countries, we need to be able to make appear on an invoice a rounding line, appearing there only because the
    smallest coinage has been removed from the circulation. For example, in Switerzland invoices have to be rounded to
    0.05 CHF because coins of 0.01 CHF and 0.02 CHF aren't used anymore.
    see https://en.wikipedia.org/wiki/Cash_rounding for more details.
    """
    _name = 'account.rounding'
    _description = 'Account Rounding'

    name = fields.Char(string='Name',translate=True, required=True)
    rounding = fields.Float(string='Rounding Precision', required=True,
        help='Represent the non-zero value smallest coinage (for example, 0.05).')
    account_id = fields.Many2one('account.account', string='Account', required=True)
    rounding_method = fields.Selection(string='Rounding Method', required=True,
        selection=[('UP', 'UP'), ('DOWN', 'DOWN'), ('HALF-UP', 'HALF-UP')],
        default='HALF-UP', help='These values must correspond to the rounding_method of the float_round tools method.')
    add_to_tax = fields.Boolean(string='Add to Biggest Tax',
        help='Add the rounding amount to the biggest tax found like the Swedish rounding system.')

    @api.model
    def round(self, amount):
        """
        Compute the rounding on the amount passed as parameter.
        :param amount: the amount to round
        :return: the rounded amount depending the rounding value and the rounding method
        """
        return float_round(amount, precision_rounding=self.rounding, rounding_method=self.rounding_method)
