# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import fields, models, _


class Company(models.Model):

    _inherit = 'res.company'

    leave_timesheet_project_id = fields.Many2one('project.project', string="Internal Project", help="Default project value for timesheet generated from leave type.")
    leave_timesheet_task_id = fields.Many2one('project.task', string="Leave Task")

    def _init_column(self, name):
        super(Company, self)._init_column(name)

        if name == 'leave_timesheet_project_id':
            for company in self.search([('leave_timesheet_project_id', '=', False)]):
                project_id = self.env['project.project'].create({
                    'name': _('Internal Project'),
                    'allow_timesheets': True,
                    'active': False,
                    'company_id': company.id,
                }).id
                task_id = self.env['project.task'].create({
                    'name': _('Leaves'),
                    'project_id': project_id,
                    'active': False,
                }).id
                company.write({
                    'leave_timesheet_project_id': project_id,
                    'leave_timesheet_task_id': task_id,
                })
