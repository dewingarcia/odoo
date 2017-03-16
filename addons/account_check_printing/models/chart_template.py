# -*- coding: utf-8 -*-

from odoo import api, models


class WizardMultiChartsAccounts(models.TransientModel):
    '''
    Inherited this class so that we can set appropriate default payment methods
    on journals(of type `bank` and `cash` only) created while CoA is being installed.
    '''
    _inherit = 'wizard.multi.charts.accounts'

    @api.multi
    def _create_bank_journals_from_o2m(self, company, acc_template_ref):
        '''
        This method is currently only used to create a default bank and cash journal
        when the CoA is installed,so we will keep only `manual` as it's payment method
        when journal of type `cash` is created by super call.
        '''
        bank_journals = super(WizardMultiChartsAccounts, self)._create_bank_journals_from_o2m(company, acc_template_ref)
        payment_method_check = self.env.ref('account_check_printing.account_payment_method_check')
        bank_journals.filtered(lambda journal: journal.type == 'cash').write({
            'outbound_payment_method_ids': [(3, payment_method_check.id)]
        })
        return bank_journals
