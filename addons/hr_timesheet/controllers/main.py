# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo.http import request

from odoo.addons.project.controllers.main import ProjectController


class ProjectTimesheetController(ProjectController):

    def _prepare_plan_values(self, project):
        values = super(ProjectTimesheetController, self)._prepare_plan_values(project)

        if project.allow_timesheets:
            values.setdefault('timesheet', {}).update({})
        return values
