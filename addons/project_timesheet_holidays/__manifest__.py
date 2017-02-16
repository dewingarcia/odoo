# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

{
    'name': 'Timesheet with leaves',
    'version': '0.5',
    'category': 'Human Resources',
    'summary': 'Scheldule timesheets and leaves',
    'description': """
Bridge module to integrate holidays in timesheet
    """,
    'depends': ['hr_timesheet', 'hr_holidays'],
    'data': [
        'views/res_config_views.xml',
        'views/hr_holidays_views.xml',
    ],
    'demo': [],
    'installable': True,
    'auto_install': True,
}
