// FEE COLLECTION
function openFeeModal() {
    document.getElementById("feeModal").classList.remove("hidden");
}

function closeFeeModal() {
    document.getElementById("feeModal").classList.add("hidden");
}


// Fee Structure
function openfeeStructureModal() {
    document.getElementById("feeStructure").classList.remove("hidden");
}

function closefeeStructureModal() {
    document.getElementById("feeStructure").classList.add("hidden");
}


// Pending Fees
function openPendingFeeModal() {
    document.getElementById("pendingFees").classList.remove("hidden");
}

function closePendingFeeModal() {
    document.getElementById("pendingFees").classList.add("hidden");
}

// Reminder Modal
function openRemindeFeeModal() {
    document.getElementById("ReminderFees").classList.remove("hidden");
}

function closeRemindeFeeModal() {
    document.getElementById("ReminderFees").classList.add("hidden");
}

// Add Expanse Section
// OPEN MODAL
function openExpenseModal() {
    document.getElementById("expenseModal").classList.remove("hidden");
}

// CLOSE MODAL
function closeExpenseModal() {
    document.getElementById("expenseModal").classList.add("hidden");
}

// DELETE ROW
function deleteRow(btn) {
    const row = btn.closest("tr");
    row.remove();
}


// Expense Categories
let editingRow = null;

// OPEN MODAL
function openCategoryModal() {
    editingRow = null;
    document.getElementById("modalTitle").innerText = "Add Category";
    document.getElementById("categoryName").value = "";
    document.getElementById("categoryDesc").value = "";
    document.getElementById("categoryModal").classList.remove("hidden");
}

// CLOSE MODAL
function closeCategoryModal() {
    document.getElementById("categoryModal").classList.add("hidden");
}

// SAVE CATEGORY
function saveCategory() {
    const name = document.getElementById("categoryName").value;
    const desc = document.getElementById("categoryDesc").value;

    if (!name) return alert("Category name required");

    if (editingRow) {
        editingRow.cells[0].innerText = name;
        editingRow.cells[1].innerText = desc;
    } else {
        const table = document.getElementById("categoryTable");

        const row = document.createElement("tr");
        row.innerHTML = `
            <td class="px-4 py-3">${name}</td>
            <td class="px-4 py-3">${desc}</td>
            <td class="px-4 py-3">0</td>
            <td class="px-4 py-3 flex gap-2">
                <button onclick="editCategory(this)" class="text-blue-600">Edit</button>
                <button onclick="deleteRow(this)" class="text-red-600">Delete</button>
            </td>
        `;

        table.appendChild(row);
    }

    closeCategoryModal();
}

// EDIT
function editCategory(btn) {
    editingRow = btn.closest("tr");

    document.getElementById("modalTitle").innerText = "Edit Category";
    document.getElementById("categoryName").value = editingRow.cells[0].innerText;
    document.getElementById("categoryDesc").value = editingRow.cells[1].innerText;

    openCategoryModal();
}

// DELETE
function deleteRow(btn) {
    if (confirm("Delete this category?")) {
        btn.closest("tr").remove();
    }
}

// ================= SECTION NAVIGATION =================
document.querySelectorAll(".menu-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const section = btn.getAttribute("data-section");

        document.querySelectorAll(".section").forEach(sec => {
            sec.classList.add("hidden");
        });

        document.getElementById(section + "Section")?.classList.remove("hidden");
    });
});

// ================= MODALS =================

// Expense Modal
function openExpenseModal() {
    document.getElementById("expenseModal").classList.remove("hidden");
}
function closeExpenseModal() {
    document.getElementById("expenseModal").classList.add("hidden");
}

// Category Modal
function openCategoryModal() {
    document.getElementById("categoryModal").classList.remove("hidden");
}
function closeCategoryModal() {
    document.getElementById("categoryModal").classList.add("hidden");
}

// ================= COMMON =================

// Delete row
function deleteRow(btn) {
    btn.closest("tr").remove();
}



// Salary Management
// OPEN
function openSalaryModal() {
    document.getElementById("salaryModal").classList.remove("hidden");
}

// CLOSE
function closeSalaryModal() {
    document.getElementById("salaryModal").classList.add("hidden");
}

// VIEW PAYSLIP (demo)
function viewPayslip() {
    alert("Payslip preview coming soon!");
}


// Payslip
// OPEN
function openPayslipModal() {
    document.getElementById("payslipModal").classList.remove("hidden");
}

// CLOSE
function closePayslipModal() {
    document.getElementById("payslipModal").classList.add("hidden");
}


// Income Section
// OPEN
function openIncomeModal() {
    document.getElementById("incomeModal").classList.remove("hidden");
}

// CLOSE
function closeIncomeModal() {
    document.getElementById("incomeModal").classList.add("hidden");
}

// DELETE ROW
function deleteRow(btn) {
    btn.closest("tr").remove();
}


// VIEW TRANSACTION SECTION
function viewTransaction() {
    document.getElementById("transactionModal").classList.remove("hidden");
}

// CLOSE
function closeTransactionModal() {
    document.getElementById("transactionModal").classList.add("hidden");
}


// Bank Accounts Section
// OPEN MODAL
function openAccountModal() {
    document.getElementById("accountModal").classList.remove("hidden");
}

// CLOSE MODAL
function closeAccountModal() {
    document.getElementById("accountModal").classList.add("hidden");
}

// VIEW ACCOUNT
function viewAccount() {
    alert("Account details & transaction history coming soon!");
}


// Financial Reports Section
function generateReport() {
    alert("Report generated based on filters!");
}


// Profit and Loss
function generatePL() {
    alert("Profit & Loss report generated!");
}

// STUDENT section
// OPEN CLASS
function openClassDetail() {
    document.getElementById("classDetailModal").classList.remove("hidden");
}

// CLOSE CLASS
function closeClassDetail() {
    document.getElementById("classDetailModal").classList.add("hidden");
}

// OPEN STUDENT PROFILE
function openStudentProfile() {
    document.getElementById("studentProfileModal").classList.remove("hidden");
}

// CLOSE PROFILE
function closeStudentProfile() {
    document.getElementById("studentProfileModal").classList.add("hidden");
}


// Teachers Section
// OPEN PROFILE
function openStaffProfile() {
    document.getElementById("staffProfileModal").classList.remove("hidden");
}

// CLOSE PROFILE
function closeStaffProfile() {
    document.getElementById("staffProfileModal").classList.add("hidden");
}


function markAsRead(el) {
    el.innerText = "Read";
    el.classList.remove("text-indigo-600");
    el.classList.add("text-gray-500");
}


function applyLogFilter() {
    alert("Filter applied (connect backend later)");
}


function goToSection(sectionId) {

    document.querySelectorAll(".section").forEach(sec => {
        sec.classList.add("hidden");
    });

    document.getElementById(sectionId + "Section")?.classList.remove("hidden");
}
