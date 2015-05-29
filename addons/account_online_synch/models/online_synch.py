# -*- coding: utf-8 -*-
import datetime
import time

from openerp import api, fields, models
from openerp.tools.translate import _

"""
This module manage an "online account" for a journal. It can't be used in standalone,
other module have to be install (like Plaid or Yodlee). Theses modules must be given
for the online_account reference field. They manage how the bank statement are retrived
from a web service.
"""

class OnlineAccount(models.Model):
    """
    This class is used as an interface.
    It is used to save the state of the current online accout.
    """
    _name = 'online.account'
    _inherit = 'mail.thread'

    name = fields.Char("Name", required=1)
    journal_id = fields.Many2one('account.journal', required=1)
    last_synch = fields.Date("Last synchronization")

    @api.multi
    def online_synch(self):
        raise Exception(_("Must be implemented"))

    @api.multi
    def update_account(self):
        raise Exception(_("Must be implemented"))

class OnlineInstitution(models.Model):
    """
    This class represent an instution. The user can choice any of them.
    Create a record of this model allow the user to pick it.
    The fields are :
    - name = the displayed name
    - online_id = the name of the instution for the webservice
    - sequence = The user will only have the institution with the lower sequence
    - action_model = The name of a model which has the method "create_wizard_from_id"
    """
    _name = 'online.institution'

    name = fields.Char("Name", required=1)
    online_id = fields.Char("Id", required=1)
    sequence = fields.Integer(required=1)
    action_model = fields.Char("Model", required=1)

    @api.model
    def create(self, values):
        """
        There is only one record by bank name. The record with the lower sequence is keep.
        """
        existant = self.search([('name', '=', values['name'])])
        if not existant or (values['sequence'] < existant.sequence):
            if existant:
                existant.unlink()
            return super(OnlineInstitution, self).create(values)

    _sql_constraints = [
                 ('name_unique', 'unique(name)', 'There can be only one record by bank')
    ]
        
class AccountJournal(models.Model):
    _inherit = "account.journal"

    online_account = fields.Reference(selection=[])
    next_synchronization = fields.Datetime("Next synchronization", compute='_compute_next_synchronization')

    @api.one
    def _compute_next_synchronization(self):
        self.next_synchronization = self.env['ir.cron'].search([('name', '=', 'online.synch.cron')], limit=1).nextcall

    @api.multi
    def get_journal_dashboard_datas(self):
        res = super(AccountJournal, self).get_journal_dashboard_datas()
        if self.online_account:
            res['show_import'] = False
        return res

    @api.multi
    def launch_online_wizard(self):
        return self.env['online.synch.wizard'].create_wizard()
        
    @api.model
    def launch_online_synch(self):
        for journal in self.search([('online_account', '!=', False)]):
            try:
                journal.online_account.online_synch()
            except:
                pass

    @api.multi
    def online_synch(self):
        return self.online_account.online_synch()
        
    @api.multi
    def update_account(self):
        return self.online_account.update_account()

    @api.multi
    def remove_online_account(self):
        self.online_account = False

class AccountBankStatement(models.Model):
    _inherit = "account.bank.statement"

    @api.model
    def online_synch_bank_statement(self, transactions, journal):
        """
         build a bank statement from a list of transaction
         Pre :
         - transactions: A list of transactions that will be created in the new bank statement.
         The format is  : [{'id': online id,                  (unique ID for the transaction)
                            'date': transaction date,         (The date of the transaction)
                            'description': transaction description,  (The description)
                            'amount': transaction amount,     (The amount of the transaction. Positif for debit, negative for credit)
                            'end_amount': total amount on the account
                          }, ...]
                          There is an optional field 'location' for the partner. See _find_partner for specification
         - journal: The journal (account.journal) of the new bank statement

         Return : True if there is no new bank statement.
                  An action to the new bank statement if it exists. A message is also post in the online_account of the journal
        """
        all_lines = self.env['account.bank.statement.line'].search([('journal_id', '=', journal.id),
                                                                    ('date', '>=', journal.online_account.last_synch)])
        statement = self.create({
                        'journal_id': journal.id,
                        'name': "WEB/" + datetime.datetime.now().strftime("%Y%m%d-%H%M"),
                    })
        total = 0
        have_line = False
        last_date = False
        end_amount = 0
        for transaction in transactions:
            if all_lines.search_count([('online_id', '=', transaction['id'])]) > 0:
                continue
            have_line = True
            line = self.env['account.bank.statement.line'].create({
                'date': transaction['date'],
                'name': transaction['description'],
                'amount': transaction['amount'],
                'online_id': transaction['id'],
                'statement_id': statement.id,
            })
            total += transaction['amount']
            end_amount = transaction['end_amount']
            # Partner from address
            if 'location' in transaction:
                line['partner_id'] = self._find_partner(transaction['location'])
            # Get the last date
            if not last_date or transaction['date'] > last_date:
                last_date = transaction['date']
                
        # If there is no new transaction, the bank statement is removed
        if not have_line:
            statement.unlink()
            return True

        # For first synchronization, an opening bank statement line is created to fill the missing bank statements
        all_statement = self.search_count([('journal_id', '=', journal.id)])
        if all_statement == 1 and end_amount - total != 0:
            self.env['account.bank.statement.line'].create({
                'date': datetime.datetime.now(),
                'name': _("Opening statement : first synchronization"),
                'amount': end_amount - total,
                'statement_id': statement.id,
            })
            total = end_amount

        journal.online_account.last_synch = last_date

        statement.balance_end_real = end_amount
        statement.balance_start = end_amount - total

        # Message in mail thread
        subject = _("Bank statement synchronized")
        body = _("The synchronization of the journal %s is done.") % journal.name
        journal.online_account.message_post(body=body, subject=subject)

	return journal.action_open_reconcile()

    @api.model
    def _find_partner(self, location):
        """
        Return a recordset of partner if the address of the transaction exactly match the address of a partner
        location : a dictionary of type:
                   {'state': x, 'address': y, 'city': z, 'zip': w}
                   state and zip are optional

        """
        partners = self.env['res.partner']
        domain = []
        if 'address' in location and 'city' in location:
            domain.append(('street', '=', location['address']))
            domain.append(('city', '=', location['city']))
            if 'state' in location: 
                domain.append(('state_id.name', '=', location['state']))
            if 'zip' in location:
                domain.append(('zip', '=', location['zip']))
            return partners.search(domain, limit=1)
        return partners

class AccountBankStatementLine(models.Model):
    _inherit = 'account.bank.statement.line'

    online_id = fields.Char("Online Id")

class OnlineSynchWizard(models.TransientModel):
    """
    This wizard let the user choice an institution
    """
    _name = 'online.synch.wizard'

    institution_id = fields.Many2one('online.institution', "Institution")
    error = fields.Char("Error")
    
    @api.model
    def create_wizard(self):
        wizard = self.create({})
        return wizard.launch_wizard()
        
    @api.multi
    def launch_wizard(self):
        return {
            'name': 'Select a bank',
            'view_type': 'form',
            'view_mode': 'form',
            'res_model': 'online.synch.wizard',
            'res_id': self.id,
            'type': 'ir.actions.act_window',
            'target': 'new',
            'context': self.env.context,
        }
        
    @api.multi
    def login(self):
        return self.env[self.institution_id.action_model].create_wizard_from_id(self.institution_id.online_id)
