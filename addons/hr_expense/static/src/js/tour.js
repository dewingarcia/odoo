odoo.define('hr_expense.tour', function(require) {
"use strict";

var core = require('web.core');
var tour = require('web_tour.tour');

var _t = core._t;

tour.register('hr_expense_tour' ,
{
    url: "/web"
},
[tour.STEPS.MENU_MORE,
{
    trigger: '.o_app[data-menu-xmlid="hr_expense.menu_hr_expense_root"], .oe_menu_toggler[data-menu-xmlid="hr_expense.menu_hr_expense_root"]',
    content: _t("Go to the expense to attach a receipt."),
    position: 'bottom',
}, {
    trigger: '.o_list_button_add',
    extra_trigger: ".o_expense_tree",
    content: _t("<p> List your Expense by Creating it here.</p>"),
    position: 'bottom',
}, {
    trigger: '.o_expense_tree .o_checkbox > input[type=checkbox]',
    content: _t('<p>Select expenses to submit them to your manager</p>'),
    position: 'bottom'
}, {
    trigger: '.o_dropdown_toggler_btn',
    extra_trigger: ".o_expense_tree",
    content: _t('<p>Click on Action Submit To Manager to submit selected expenses to your manager</p>'),
    position: 'right',
}, {
    trigger: '.o_form_button_save',
    extra_trigger: ".o_expense_form",
    content: _t("<p> Save Your Expense. You can also discard it by clicking on discard.</p>"),
    position: 'bottom',
}, {
    trigger: '.o_expense_form .o_chatter_button_new_message',
    content: _t("Click to try <b>submitting an expense by email</b>. You can attach a photo of the receipt to the mail."),
    position: 'top',
}, {
    trigger: '.o_expense_submit',
    extra_trigger: ".o_expense_form",
    content: _t("<p>Once completed, you can <b>submit the expense</b> for approval.</p><p><i>Tip: from the list view, select all expenses to submit them all at once, in a single report.</i></p>"),
    position: 'bottom',
}, {
    trigger: '.o_expense_view_report',
    extra_trigger: ".o_expense_form",
    content: _t("<p>You can Click here to see the approval of your expense by clicking here.</p>"),
    position: 'bottom',
}, {
    trigger: '.o_expense_sheet_approve',
    content: _t("<p>Approve the sheet here.</p><p>Tip: if you refuse, don’t forget to give the reason thanks to the hereunder message tool</p>"),
    position: 'bottom',
}, {
    trigger: '.o_expense_sheet_post',
    content: _t("<p>The accountant receive approved expense reports.</p><p>He can post journal entries in one click if taxes and accounts are right.</p>"),
    position: 'bottom',
}, {
    trigger: '.o_expense_sheet_pay',
    content: _t("The accountant can register a payment to reimburse the employee directly."),
    position: 'bottom',
}, {
    trigger: 'li a[data-menu-xmlid="hr_expense.menu_hr_expense_sheet_my_all"], div[data-menu-xmlid="hr_expense.menu_hr_expense_sheet_my_all"]',
    content: _t("Managers can get all reports to approve from this menu."),
    position: 'bottom',
}]);

});
