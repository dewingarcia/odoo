# -*- coding: utf-8 -*-

from odoo.addons.account.tests.account_test_users import AccountTestUsers

import time


class TestAccountInvoiceRounding(AccountTestUsers):

    def setUp(self):
        super(AccountTestUsers, self).setUp()
        self.account_receivable = self.env['account.account'].search(
            [('user_type_id', '=', self.env.ref('account.data_account_type_receivable').id)], limit=1)
        self.account_revenue = self.env['account.account'].search(
            [('user_type_id', '=', self.env.ref('account.data_account_type_revenue').id)], limit=1)

    def create_invoice(self, amount, payment_term, tax_amount=None):
        """ Returns an open invoice """
        invoice_id = self.env['account.invoice'].create({
            'partner_id': self.env.ref("base.res_partner_2").id,
            'reference_type': 'none',
            'currency_id': self.env.ref('base.USD').id,
            'name': 'invoice test rounding',
            'account_id': self.account_receivable.id,
            'type': 'out_invoice',
            'date_invoice': time.strftime('%Y') + '-06-26',
            'payment_term_id': payment_term.id
        })
        tax_id = None
        if tax_amount:
            tax_id = self.env['account.tax'].create({
                'name': 'Tax 10.0',
                'amount': tax_amount,
                'amount_type': 'percent',
            })
        self.env['account.invoice.line'].create({
            'product_id': self.env.ref("product.product_product_4").id,
            'quantity': 1,
            'price_unit': amount,
            'invoice_id': invoice_id.id,
            'name': 'something',
            'account_id': self.account_revenue.id,
            'invoice_line_tax_ids': [(6, 0, [tax_id.id])] if tax_id else None
        })
        invoice_id._onchange_invoice_line_ids() # create the tax_line_ids
        invoice_id.action_invoice_open()
        return invoice_id

    def test_01_rounding(self):
        '''Pay 50% (Rounding up)/ 50% (Rounding down), add_invoice_line'''
        rounding_method_up = self.env['account.cash.rounding'].create({
            'name': 'rounding UP',
            'rounding': 1.0,
            'account_id': self.account_receivable.id,
            'rounding_method': 'UP',
        })
        rounding_method_down = self.env['account.cash.rounding'].create({
            'name': 'rounding DOWN',
            'rounding': 1.0,
            'account_id': self.account_receivable.id,
            'rounding_method': 'DOWN',
        })

        payment_term = self.env['account.payment.term'].create({
            'name': 'Test payment term 50%/50%',
            'line_ids': [
                (0, 0, {'value': 'percent', 'value_amount': 50.0, 'option': 'day_after_invoice_date', 'rounding_id': rounding_method_up.id}),
                (0, 0, {'value': 'balance', 'value_amount': 0.0, 'option': 'last_day_following_month', 'rounding_id': rounding_method_down.id})
            ]
        })

        inv = self.create_invoice(100.5, payment_term)
        inv_lines = inv.invoice_line_ids

        self.assertEquals(len(inv_lines), 3)

        rounding_line_1 = inv_lines[1]
        rounding_line_2 = inv_lines[2]

        self.assertEquals(rounding_line_1.price_unit, 0.75)
        self.assertEquals(rounding_line_2.price_unit, -0.25)

    def test_02_rounding(self):
        '''Pay 100% with rounding half-up, add_invoice_line'''
        rounding_method_half_up = self.env['account.cash.rounding'].create({
            'name': 'rounding HALF-UP',
            'rounding': 0.05,
            'account_id': self.account_receivable.id,
            'rounding_method': 'HALF-UP',
        })

        payment_term = self.env['account.payment.term'].create({
            'name': 'Test payment term 100%',
            'line_ids': [(0, 0, {'value': 'balance', 'value_amount': 0.0, 'option': 'day_after_invoice_date', 'rounding_id': rounding_method_half_up.id})]
        })

        inv = self.create_invoice(87.68, payment_term)
        inv_lines = inv.invoice_line_ids

        self.assertEquals(len(inv_lines), 2)

        rounding_line = inv_lines[1]

        self.assertEquals(rounding_line.price_unit, 0.02)

    def test_03_rounding(self):
        '''Pay 100% but ignore rounding with zero value'''
        rounding_method_half_up = self.env['account.cash.rounding'].create({
            'name': 'rounding HALF-UP',
            'rounding': 0.00,
            'account_id': self.account_receivable.id,
            'rounding_method': 'HALF-UP',
        })

        payment_term = self.env['account.payment.term'].create({
            'name': 'Test payment term 100%',
            'line_ids': [(0, 0, {'value': 'balance', 'value_amount': 0.0, 'option': 'day_after_invoice_date', 'rounding_id': rounding_method_half_up.id})]
        })

        inv = self.create_invoice(87.68, payment_term)
        inv_lines = inv.invoice_line_ids

        self.assertEquals(len(inv_lines), 1)

    def test_04_rounding(self):
        '''Pay 50% (Rounding up)/ 50% (Rounding down), biggest_tax but add_invoice_line behavior'''
        rounding_method_up = self.env['account.cash.rounding'].create({
            'name': 'rounding UP',
            'rounding': 1.0,
            'account_id': self.account_receivable.id,
            'strategy': 'biggest_tax',
            'rounding_method': 'UP',
        })
        rounding_method_down = self.env['account.cash.rounding'].create({
            'name': 'rounding DOWN',
            'rounding': 1.0,
            'account_id': self.account_receivable.id,
            'rounding_method': 'DOWN',
        })

        payment_term = self.env['account.payment.term'].create({
            'name': 'Test payment term 50%/50%',
            'line_ids': [
                (0, 0, {'value': 'percent', 'value_amount': 50.0, 'option': 'day_after_invoice_date',
                        'rounding_id': rounding_method_up.id}),
                (0, 0, {'value': 'balance', 'value_amount': 0.0, 'option': 'last_day_following_month',
                        'rounding_id': rounding_method_down.id})
            ]
        })

        inv = self.create_invoice(100.5, payment_term)
        inv_lines = inv.invoice_line_ids

        self.assertEquals(len(inv_lines), 3)

        rounding_line_1 = inv_lines[1]
        rounding_line_2 = inv_lines[2]

        self.assertEquals(rounding_line_1.price_unit, 0.75)
        self.assertEquals(rounding_line_2.price_unit, -0.25)

    def test_05_rounding(self):
        '''Pay 50% (Rounding half-up)/ 50% (Rounding half-up), biggest_tax'''
        rounding_method_half_up = self.env['account.cash.rounding'].create({
            'name': 'rounding HALF-UP',
            'rounding': 1.0,
            'account_id': self.account_receivable.id,
            'strategy': 'biggest_tax',
            'rounding_method': 'HALF-UP',
        })

        payment_term = self.env['account.payment.term'].create({
            'name': 'Test payment term 50%/50%',
            'line_ids': [
                (0, 0, {'value': 'percent', 'value_amount': 50.0, 'option': 'day_after_invoice_date',
                        'rounding_id': rounding_method_half_up.id}),
                (0, 0, {'value': 'balance', 'value_amount': 0.0, 'option': 'last_day_following_month',
                        'rounding_id': rounding_method_half_up.id})
            ]
        })

        inv = self.create_invoice(100.5, payment_term, tax_amount=10.0)
        inv_lines = inv.invoice_line_ids
        tax_lines = inv.tax_line_ids

        self.assertEquals(len(inv_lines), 1) # No invoice line created

        self.assertEquals(tax_lines.amount_rounding, -0.55)
