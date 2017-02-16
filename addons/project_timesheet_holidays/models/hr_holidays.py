# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from datetime import datetime

from odoo import api, fields, models


class HolidaysType(models.Model):

    _inherit = "hr.holidays.status"

    timesheet_generate = fields.Boolean('Generate Timesheet', help="If checked, when validating a leave, timesheet will be generated in the Vacation Project of the company.")
    timesheet_project_id = fields.Many2one('project.project', string="Internal Project", help="The project will contain the timesheet generated when a leave is validated.")
    timesheet_task_id = fields.Many2one('project.task', string="Internal Task for timesheet")

    @api.onchange
    def _onchange_timesheet_generate(self):
        if self.timesheet_generate:
            self.timesheet_project_id = self.company_id.leave_timesheet_project_id
            self.timesheet_task_id = self.company_id.leave_timesheet_task_id
        else:
            self.timesheet_project_id = False
            self.timesheet_task_id = False


class Holidays(models.Model):

    _inherit = "hr.holidays"

    timesheet_ids = fields.One2many('account.analytic.line', 'holiday_id', string="Analytic Lines")

    @api.multi
    def _validate_leave_request(self):
        """ Timesheet will be generated on leave validation only if a timesheet_project_id and a
            timesheet_task_id are set on the corresponding leave type. The generated timesheet will
            be attached to this project/task.
        """
        # create the timesheet on the vacation project
        for holiday in self.filtered(lambda h: h.holiday_status_id.timesheet_project_id and h.holiday_status_id.timesheet_task_id):
            resource = holiday.employee_id.resource_id
            working_calendar = resource.calendar_id
            holiday_project = holiday.holiday_status_id.timesheet_project_id
            holiday_task = holiday.holiday_status_id.timesheet_task_id
            if holiday_project:
                # get list of datetime.date of all working days covered by the holiday
                working_days_dates = [item[0].start_datetime for item in holiday.employee_id.iter_works(fields.Datetime.from_string(holiday.date_from), fields.Datetime.from_string(holiday.date_to))]

                # for all holiday day, create one timesheet line with its working hours as unit_amount
                count = 1
                for day_date in working_days_dates:
                    date_start_dt = datetime(year=day_date.year, month=day_date.month, day=day_date.day, hour=0, minute=0, second=0)
                    date_end_dt = datetime(year=day_date.year, month=day_date.month, day=day_date.day, hour=23, minute=59, second=59)

                    working_hours = working_calendar.get_work_hours_count(date_start_dt, date_end_dt, resource_id=resource.id)

                    self.env['account.analytic.line'].create({
                        'name': "%s (%s/%s)" % (holiday.name, count, len(working_days_dates)),
                        'project_id': holiday_project.id,
                        'task_id': holiday_task.id,
                        'account_id': holiday_project.analytic_account_id.id,
                        'unit_amount': working_hours,
                        'user_id': holiday.employee_id.user_id.id,
                        'date': fields.Datetime.to_string(date_start_dt),
                        'holiday_id': holiday.id,
                    })
                    count += 1

        return super(Holidays, self)._validate_leave_request()

    @api.multi
    def action_refuse(self):
        """ Remove the timesheets linked to the refused holidays """
        result = super(Holidays, self).action_refuse()
        self.mapped('timesheet_ids').unlink()
        return result
