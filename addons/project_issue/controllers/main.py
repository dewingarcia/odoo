# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo.http import request

from odoo.addons.project.controllers.main import ProjectController


class ProjectIssueController(ProjectController):

    def _prepare_plan_values(self, project):
        user_id = request.env.user.id
        values = super(ProjectIssueController, self)._prepare_plan_values(project)

        if project.user_issues:
            values.setdefault('todo', {}).update({
                'issue_my': request.env['project.issue'].search_count([('project_id', 'in', project.ids), ('user_id', '=', user_id), '|', ('stage_id.fold', '=', False), ('stage_id', '=', False)]),
                'issue_my_activities': request.env['project.issue'].search_count([('project_id', 'in', project.ids), ('user_id', '=', user_id), ('activity_ids.user_id', '=', user_id), '|', ('stage_id.fold', '=', False), ('stage_id', '=', False)]),
                'issue_my_needaction': project.issue_needaction_count,
                'issue_all': project.issue_count,
                'issue_all_activities': request.env['project.issue'].search_count([('project_id', 'in', project.ids), ('activity_ids.user_id', '=', user_id), '|', ('stage_id.fold', '=', False), ('stage_id', '=', False)]),
            })
        return values
