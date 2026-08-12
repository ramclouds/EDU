// ========== ROLE & PERMISSION CORE ENGINE ==========

const permissionActions = ["view", "create", "edit", "delete"];

const modules = [
    "Students",
    "Teachers",
    "Attendance",
    "Exams",
    "Fees",
    "Library",
    "HR",
    "Reports"
];

const roles = [
    {
        id: 1,
        name: "Super Admin",
        permissions: {
            Students: { view: true, create: true, edit: true, delete: true },
            Teachers: { view: true, create: true, edit: true, delete: true },
            Attendance: { view: true, create: true, edit: true, delete: true },
            Exams: { view: true, create: true, edit: true, delete: true },
            Fees: { view: true, create: true, edit: true, delete: true },
            Library: { view: true, create: true, edit: true, delete: true },
            HR: { view: true, create: true, edit: true, delete: true },
            Reports: { view: true, create: true, edit: true, delete: true }
        }
    },
    {
        id: 2,
        name: "Teacher",
        permissions: {
            Students: { view: true, create: false, edit: false, delete: false },
            Attendance: { view: true, create: true, edit: true, delete: false },
            Exams: { view: true, create: true, edit: true, delete: false },
            Reports: { view: true, create: false, edit: false, delete: false }
        }
    },
    {
        id: 3,
        name: "Accountant",
        permissions: {
            Students: { view: true, create: false, edit: false, delete: false },
            Fees: { view: true, create: true, edit: true, delete: false },
            Reports: { view: true, create: true, edit: false, delete: false }
        }
    }
];

const users = [
    {
        id: 1,
        name: "Rahul Sharma",
        role: "Teacher",
        type: "teaching",
        customPermissions: {}
    },
    {
        id: 2,
        name: "Aisha Khan",
        role: "Accountant",
        type: "nonTeaching",
        customPermissions: {}
    },
    {
        id: 3,
        name: "Priya Desai",
        role: "Teacher",
        type: "teaching",
        customPermissions: {}
    }
];

let selectedRoleIndex = 0;
let currentSelectedUser = null;

// Create an empty permission object for every module.
function createDefaultPermissions(defaultValue = false) {
    return modules.reduce((permissionMap, moduleName) => {
        permissionMap[moduleName] = {
            view: defaultValue,
            create: defaultValue,
            edit: defaultValue,
            delete: defaultValue
        };

        return permissionMap;
    }, {});
}

// Ensure every role contains every module and action.
function normalizeRolePermissions() {
    roles.forEach(role => {
        const normalizedPermissions = createDefaultPermissions(false);

        modules.forEach(moduleName => {
            permissionActions.forEach(action => {
                normalizedPermissions[moduleName][action] =
                    Boolean(role.permissions?.[moduleName]?.[action]);
            });
        });

        role.permissions = normalizedPermissions;
    });
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

// ========== ROLE LOGIC ==========

function loadRoles() {
    const container = document.getElementById("roleList");

    if (!container) return;

    if (!roles.length) {
        container.innerHTML = `
            <div class="p-4 text-center text-sm text-slate-500">
                No roles available.
            </div>
        `;
        return;
    }

    container.innerHTML = roles.map((role, index) => {
        const isSelected = selectedRoleIndex === index;

        return `
            <button
                type="button"
                onclick="selectRole(${index})"
                class="group w-full text-left p-4 rounded-xl cursor-pointer border transition-all duration-200
                    ${isSelected
                ? "bg-indigo-600 border-indigo-600 text-white shadow-indigo-200 shadow-lg"
                : "bg-white border-slate-100 hover:border-indigo-300 hover:bg-indigo-50"
            }"
            >
                <div class="flex justify-between items-center gap-3">
                    <span class="font-bold ${isSelected ? "text-white" : "text-slate-700"
            }">
                        ${escapeHtml(role.name)}
                    </span>

                    <span class="${isSelected
                ? "opacity-100"
                : "opacity-40 group-hover:opacity-100"
            } transition-opacity">
                        ➔
                    </span>
                </div>
            </button>
        `;
    }).join("");
}

function selectRole(index) {
    if (!Number.isInteger(index) || !roles[index]) return;

    selectedRoleIndex = index;

    const selectedRoleTitle = document.getElementById("selectedRoleTitle");

    if (selectedRoleTitle) {
        selectedRoleTitle.textContent = roles[index].name;
    }

    loadRoles();
    renderRoleTable();
}

function renderRoleTable() {
    const table = document.getElementById("permissionTable");

    if (!table) return;

    const role = roles[selectedRoleIndex];

    if (!role) {
        table.innerHTML = `
            <tr>
                <td colspan="5" class="p-8 text-center text-slate-500">
                    Select a role to manage permissions.
                </td>
            </tr>
        `;
        return;
    }

    table.innerHTML = modules.map(moduleName => `
        <tr class="hover:bg-slate-50/80 transition">
            <td class="p-4 font-bold text-slate-700">
                ${escapeHtml(moduleName)}
            </td>

            ${permissionActions.map(action => `
                <td class="p-4 text-center">
                    <input
                        type="checkbox"
                        aria-label="${escapeHtml(moduleName)} ${action}"
                        class="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        ${role.permissions[moduleName][action] ? "checked" : ""}
                        onchange="updateRoleKey(
                            '${moduleName}',
                            '${action}',
                            this.checked
                        )"
                    >
                </td>
            `).join("")}
        </tr>
    `).join("");
}

function updateRoleKey(moduleName, action, value) {
    const role = roles[selectedRoleIndex];

    if (!role) return;
    if (!modules.includes(moduleName)) return;
    if (!permissionActions.includes(action)) return;

    role.permissions[moduleName][action] = Boolean(value);

    // Refresh user table because inherited permissions may have changed.
    if (currentSelectedUser) {
        renderUserTable();
    }
}

function setAllRolePermissions(value) {
    const role = roles[selectedRoleIndex];

    if (!role) return;

    modules.forEach(moduleName => {
        permissionActions.forEach(action => {
            role.permissions[moduleName][action] = Boolean(value);
        });
    });

    renderRoleTable();

    if (currentSelectedUser) {
        renderUserTable();
    }
}

function savePermissions() {
    const role = roles[selectedRoleIndex];

    if (!role) {
        showPermissionToast("Please select a role first.", "error");
        return;
    }

    /*
    Replace this section with your API request:

    fetch("/api/admin/roles/" + role.id + "/permissions", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            role_id: role.id,
            permissions: role.permissions
        })
    });
    */

    console.log("Role permissions payload:", {
        role_id: role.id,
        role_name: role.name,
        permissions: role.permissions
    });

    showPermissionToast(
        `${role.name} permissions updated successfully.`,
        "success"
    );
}

// ========== USER FILTER AND OVERRIDE LOGIC ==========

function filterUsers() {
    const staffTypeFilter = document.getElementById("staffTypeFilter");
    const userSelect = document.getElementById("userSelect");
    const panel = document.getElementById("userOverridePanel");

    if (!staffTypeFilter || !userSelect) return;

    const selectedType = staffTypeFilter.value;

    const filteredUsers = selectedType
        ? users.filter(user => user.type === selectedType)
        : users;

    userSelect.innerHTML = `
        <option value="">Choose User...</option>
        ${filteredUsers.map(user => `
            <option value="${user.id}">
                ${escapeHtml(user.name)} (${escapeHtml(user.role)})
            </option>
        `).join("")}
    `;

    currentSelectedUser = null;

    if (panel) {
        panel.classList.add("hidden");
    }
}

function selectUser(userId) {
    const numericUserId = Number(userId);

    currentSelectedUser = users.find(
        user => user.id === numericUserId
    ) || null;

    const panel = document.getElementById("userOverridePanel");

    if (!panel) return;

    if (!currentSelectedUser) {
        panel.classList.add("hidden");
        clearUserPanel();
        return;
    }

    panel.classList.remove("hidden");

    const userName = document.getElementById("userName");
    const userInitial = document.getElementById("userInitial");
    const userBaseRole = document.getElementById("userBaseRole");

    if (userName) {
        userName.textContent = currentSelectedUser.name;
    }

    if (userInitial) {
        userInitial.textContent =
            currentSelectedUser.name.trim().charAt(0).toUpperCase() || "U";
    }

    if (userBaseRole) {
        userBaseRole.textContent =
            `Base Role: ${currentSelectedUser.role}`;
    }

    renderUserTable();
    updateOverrideStatusBadge();
}

function clearUserPanel() {
    const userName = document.getElementById("userName");
    const userInitial = document.getElementById("userInitial");
    const userBaseRole = document.getElementById("userBaseRole");
    const table = document.getElementById("userPermissionTable");

    if (userName) userName.textContent = "";
    if (userInitial) userInitial.textContent = "U";
    if (userBaseRole) userBaseRole.textContent = "";
    if (table) table.innerHTML = "";
}

function getBaseRoleForUser(user) {
    if (!user) return null;

    return roles.find(
        role => role.name.toLowerCase() === user.role.toLowerCase()
    ) || null;
}

function getUserPermissionDetails(user, moduleName, action) {
    const baseRole = getBaseRoleForUser(user);

    const inheritedValue =
        Boolean(baseRole?.permissions?.[moduleName]?.[action]);

    const customModule = user.customPermissions?.[moduleName];

    const hasOverride =
        customModule &&
        Object.prototype.hasOwnProperty.call(customModule, action);

    const customValue = hasOverride
        ? Boolean(customModule[action])
        : undefined;

    return {
        inheritedValue,
        customValue,
        hasOverride,
        finalValue: hasOverride ? customValue : inheritedValue
    };
}

function renderUserTable() {
    const table = document.getElementById("userPermissionTable");

    if (!table) return;

    if (!currentSelectedUser) {
        table.innerHTML = "";
        return;
    }

    const baseRole = getBaseRoleForUser(currentSelectedUser);

    if (!baseRole) {
        table.innerHTML = `
            <tr>
                <td colspan="5" class="p-8 text-center text-red-500">
                    Base role "${escapeHtml(currentSelectedUser.role)}"
                    was not found.
                </td>
            </tr>
        `;
        return;
    }

    table.innerHTML = modules.map(moduleName => `
        <tr class="hover:bg-slate-50/60 transition">
            <td class="p-3 font-semibold text-slate-600">
                <div>${escapeHtml(moduleName)}</div>
                <div class="text-[10px] font-normal text-slate-400 mt-0.5">
                    Inherited from ${escapeHtml(baseRole.name)}
                </div>
            </td>

            ${permissionActions.map(action => {
        const permission = getUserPermissionDetails(
            currentSelectedUser,
            moduleName,
            action
        );

        return `
                    <td class="p-3 text-center ${permission.hasOverride
                ? "bg-amber-50/70"
                : ""
            }">
                        <div class="flex flex-col items-center gap-1">
                            <input
                                type="checkbox"
                                aria-label="${escapeHtml(moduleName)} ${action}"
                                class="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                ${permission.finalValue ? "checked" : ""}
                                onchange="updateUserOverride(
                                    '${moduleName}',
                                    '${action}',
                                    this.checked
                                )"
                            >

                            ${permission.hasOverride
                ? `
                                        <button
                                            type="button"
                                            onclick="removeUserOverride(
                                                '${moduleName}',
                                                '${action}'
                                            )"
                                            class="text-[8px] text-amber-600 hover:text-red-600 font-black uppercase leading-none"
                                            title="Click to restore inherited role permission"
                                        >
                                            Manual ×
                                        </button>
                                    `
                : `
                                        <div
                                            class="text-[8px] text-slate-400 font-bold uppercase leading-none"
                                            title="Inherited from ${escapeHtml(baseRole.name)}"
                                        >
                                            Role
                                        </div>
                                    `
            }
                        </div>
                    </td>
                `;
    }).join("")}
        </tr>
    `).join("");

    updateOverrideStatusBadge();
}

function updateUserOverride(moduleName, action, value) {
    if (!currentSelectedUser) return;
    if (!modules.includes(moduleName)) return;
    if (!permissionActions.includes(action)) return;

    if (!currentSelectedUser.customPermissions[moduleName]) {
        currentSelectedUser.customPermissions[moduleName] = {};
    }

    currentSelectedUser.customPermissions[moduleName][action] =
        Boolean(value);

    renderUserTable();
}

function removeUserOverride(moduleName, action) {
    if (!currentSelectedUser) return;

    const modulePermissions =
        currentSelectedUser.customPermissions?.[moduleName];

    if (!modulePermissions) return;

    delete modulePermissions[action];

    if (Object.keys(modulePermissions).length === 0) {
        delete currentSelectedUser.customPermissions[moduleName];
    }

    renderUserTable();
}

function resetUserOverrides() {
    if (!currentSelectedUser) {
        showPermissionToast("Please select a user first.", "error");
        return;
    }

    currentSelectedUser.customPermissions = {};

    renderUserTable();

    showPermissionToast(
        `${currentSelectedUser.name} now inherits all permissions from ${currentSelectedUser.role}.`,
        "success"
    );
}

function updateOverrideStatusBadge() {
    const badge = document.getElementById("overrideStatusBadge");

    if (!badge || !currentSelectedUser) return;

    const overrideCount = Object.values(
        currentSelectedUser.customPermissions || {}
    ).reduce((count, modulePermissions) => {
        return count + Object.keys(modulePermissions || {}).length;
    }, 0);

    if (overrideCount > 0) {
        badge.textContent = `${overrideCount} Custom Override${overrideCount > 1 ? "s" : ""
            } Active`;

        badge.className =
            "bg-amber-100 text-amber-700 text-[10px] font-black px-3 py-1 rounded-full uppercase";
    } else {
        badge.textContent = "Using Base Role";

        badge.className =
            "bg-emerald-100 text-emerald-700 text-[10px] font-black px-3 py-1 rounded-full uppercase";
    }
}

function saveUserPermissions() {
    if (!currentSelectedUser) {
        showPermissionToast("Please select a user first.", "error");
        return;
    }

    /*
    Replace this section with your API request:

    fetch(
        "/api/admin/users/" +
        currentSelectedUser.id +
        "/permissions",
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                user_id: currentSelectedUser.id,
                role: currentSelectedUser.role,
                custom_permissions:
                    currentSelectedUser.customPermissions
            })
        }
    );
    */

    console.log("User permission payload:", {
        user_id: currentSelectedUser.id,
        user_name: currentSelectedUser.name,
        role: currentSelectedUser.role,
        custom_permissions:
            currentSelectedUser.customPermissions
    });

    showPermissionToast(
        `${currentSelectedUser.name}'s permissions updated successfully.`,
        "success"
    );
}

// ========== NEW ROLE MODAL ==========

function openRoleModal() {
    let modal = document.getElementById("roleCreationModal");

    if (!modal) {
        modal = document.createElement("div");
        modal.id = "roleCreationModal";

        modal.className =
            "fixed inset-0 z-[9999] hidden items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm";

        modal.innerHTML = `
            <div class="w-full max-w-md rounded-2xl bg-white shadow-2xl">
                <div class="flex items-center justify-between border-b border-slate-100 p-5">
                    <div>
                        <h3 class="text-lg font-bold text-slate-800">
                            Create New Role
                        </h3>
                        <p class="text-xs text-slate-500">
                            Add a new system role with empty permissions.
                        </p>
                    </div>

                    <button
                        type="button"
                        onclick="closeRoleModal()"
                        class="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                    >
                        ✕
                    </button>
                </div>

                <form onsubmit="createNewRole(event)" class="space-y-4 p-5">
                    <div>
                        <label
                            for="newRoleName"
                            class="mb-1.5 block text-sm font-semibold text-slate-700"
                        >
                            Role Name
                        </label>

                        <input
                            id="newRoleName"
                            type="text"
                            maxlength="50"
                            required
                            autocomplete="off"
                            placeholder="Example: Hostel Admin"
                            class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        >
                    </div>

                    <div class="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onclick="closeRoleModal()"
                            class="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            class="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
                        >
                            Create Role
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");

    const input = document.getElementById("newRoleName");

    if (input) {
        input.value = "";
        setTimeout(() => input.focus(), 0);
    }
}

function closeRoleModal() {
    const modal = document.getElementById("roleCreationModal");

    if (!modal) return;

    modal.classList.add("hidden");
    modal.classList.remove("flex");
}

function createNewRole(event) {
    event.preventDefault();

    const input = document.getElementById("newRoleName");

    if (!input) return;

    const roleName = input.value.trim();

    if (!roleName) {
        showPermissionToast("Role name is required.", "error");
        return;
    }

    const roleAlreadyExists = roles.some(
        role => role.name.toLowerCase() === roleName.toLowerCase()
    );

    if (roleAlreadyExists) {
        showPermissionToast("This role already exists.", "error");
        return;
    }

    const nextRoleId = roles.length
        ? Math.max(...roles.map(role => Number(role.id) || 0)) + 1
        : 1;

    roles.push({
        id: nextRoleId,
        name: roleName,
        permissions: createDefaultPermissions(false)
    });

    selectedRoleIndex = roles.length - 1;

    closeRoleModal();
    loadRoles();
    selectRole(selectedRoleIndex);

    showPermissionToast(
        `${roleName} role created successfully.`,
        "success"
    );
}

// ========== TOAST ==========

function showPermissionToast(message, type = "success") {
    const existingToast =
        document.getElementById("permissionToast");

    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement("div");
    toast.id = "permissionToast";

    toast.className = `
        fixed right-5 top-5 z-[10000]
        max-w-sm rounded-xl px-5 py-3
        text-sm font-bold text-white shadow-2xl
        transition-all duration-300
        ${type === "error"
            ? "bg-red-600"
            : "bg-emerald-600"
        }
    `;

    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("opacity-0", "translate-y-[-10px]");

        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// ========== INITIALIZE AFTER HTML LOADS ==========

function initializeRolePermissionEngine() {
    normalizeRolePermissions();
    loadRoles();
    filterUsers();

    if (roles.length > 0) {
        selectRole(0);
    }
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeRolePermissionEngine
    );
} else {
    initializeRolePermissionEngine();
}