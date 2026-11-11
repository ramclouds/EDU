import { useRef } from "react";
import toast from "react-hot-toast";
import { BASE_URL } from "../config/appConfig";
import UserAvatar, { notifyPhotoChanged } from "./UserAvatar";

const card =
  "rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800";
const input =
  "mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100";

const PERSONAL = [
  { name: "first_name", label: "First name", required: true },
  { name: "middle_name", label: "Middle name" },
  { name: "last_name", label: "Last name", required: true },
  { name: "gender", label: "Gender", options: ["Male", "Female", "Other"] },
  { name: "date_of_birth", label: "Date of birth", type: "date" },
  { name: "blood_group", label: "Blood group", options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] },
];
const CONTACT = [
  { name: "email", label: "Email", type: "email" },
  { name: "mobile", label: "Mobile", type: "tel" },
  { name: "address", label: "Address", wide: true, textarea: true },
  { name: "city", label: "City" },
  { name: "state", label: "State" },
  { name: "pincode", label: "Postal code" },
];
const QUALIFICATION = [
  { name: "degree", label: "Degree" },
  { name: "university", label: "University" },
  { name: "specialization", label: "Specialisation" },
];
const EMERGENCY = [
  { name: "emergency_name", label: "Contact name" },
  { name: "emergency_relation", label: "Relation" },
  { name: "emergency_phone", label: "Contact phone", type: "tel" },
];
// Set by the school administrator. Shown here, not editable by the teacher.
const EMPLOYMENT = [
  { name: "teacher_id", label: "Teacher ID" },
  { name: "designation", label: "Designation" },
  { name: "employment_type", label: "Employment type" },
  { name: "shift", label: "Shift" },
  { name: "joining_date", label: "Joining date" },
  { name: "experience_years", label: "Experience (years)" },
  { name: "status", label: "Status" },
  { name: "username", label: "Username" },
];

const shown = (value) => (value === null || value === undefined || value === "" ? "Not added" : String(value));

function Field({ field, teacher, formData, editMode, onChange, editable }) {
  const value = teacher?.[field.name];
  if (!editMode || !editable) {
    return (
      <div className={field.wide ? "sm:col-span-2" : ""}>
        <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{field.label}</dt>
        <dd className={`mt-1 text-sm ${value ? "text-gray-800 dark:text-gray-100" : "text-gray-400 italic"}`}>
          {field.name === "date_of_birth" || field.name === "joining_date"
            ? shown(value ? String(value).slice(0, 10) : "")
            : shown(value)}
        </dd>
      </div>
    );
  }
  const current = formData?.[field.name] ?? "";
  return (
    <label className={`block text-sm font-medium text-gray-700 dark:text-gray-300 ${field.wide ? "sm:col-span-2" : ""}`}>
      {field.label}
      {field.required && <span className="text-red-500"> *</span>}
      {field.options ? (
        <select name={field.name} value={current} onChange={onChange} className={input}>
          <option value="">Select</option>
          {field.options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : field.textarea ? (
        <textarea name={field.name} value={current} onChange={onChange} rows={2} className={input} />
      ) : (
        <input
          name={field.name}
          type={field.type || "text"}
          value={field.type === "date" ? String(current).slice(0, 10) : current}
          onChange={onChange}
          className={input}
        />
      )}
    </label>
  );
}

function Group({ title, hint, children, className = "" }) {
  return (
    <section className={`${card} ${className}`}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
        {hint && <p className="text-xs text-gray-400">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export default function TeacherProfileSection({
  teacher,
  formData,
  setFormData,
  editMode,
  setEditMode,
  handleChange,
  handleSave,
  assignedClasses = [],
  onChangePassword,
}) {
  const photoInput = useRef(null);

  // Upload a new photo (PNG, JPEG or WEBP, up to 2 MB). The avatars update straight away.
  const uploadPhoto = async (file) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Choose a photo up to 2 MB");
      return;
    }
    const form = new FormData();
    form.append("photo", file);
    try {
      const res = await fetch(`${BASE_URL}/me/photo`, { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Could not save the photo");
        return;
      }
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...user, profile_image: data.profile_image }));
      notifyPhotoChanged();
      toast.success("Photo saved");
    } catch {
      toast.error("Could not reach the server");
    }
  };
  const fullName = [teacher?.first_name, teacher?.middle_name, teacher?.last_name].filter(Boolean).join(" ") || "Teacher";

  // Classes grouped by class, with the subjects taught in each.
  const byClass = new Map();
  (assignedClasses || []).forEach((row) => {
    const key = row.academic_class_id ?? row.class_name;
    if (!byClass.has(key)) byClass.set(key, { name: row.class_name, subjects: [] });
    if (row.subject_name) byClass.get(key).subjects.push(row.subject_name);
  });

  const renderFields = (fields, editableFields = true) =>
    fields.map((f) => (
      <Field
        key={f.name}
        field={f}
        teacher={teacher}
        formData={formData}
        editMode={editMode}
        editable={editableFields}
        onChange={handleChange}
      />
    ));

  const cancel = () => {
    setFormData(teacher || {});
    setEditMode(false);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* HEADER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 text-white shadow-xl sm:p-8">
        <div className="absolute inset-0 bg-white/10 backdrop-blur-xl" />
        <div className="relative flex flex-col items-center gap-6 sm:flex-row">
          <div className="relative">
            <UserAvatar className="h-24 w-24 border-4 border-white shadow-lg sm:h-28 sm:w-28" />
            <input
              ref={photoInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                uploadPhoto(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => photoInput.current?.click()}
              className="absolute -bottom-1 -right-1 rounded-full bg-white px-2 py-1 text-xs font-medium text-indigo-600 shadow hover:bg-indigo-50"
              aria-label="Change photo"
            >
              <i className="bi bi-camera" />
            </button>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{fullName}</h2>
            <p className="mt-1 text-sm text-white/85">
              {teacher?.designation || "Teacher"}
              {teacher?.teacher_id ? ` · ${teacher.teacher_id}` : ""}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              {teacher?.status && (
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">{teacher.status}</span>
              )}
              {teacher?.email && <span className="rounded-full bg-white/20 px-3 py-1 text-xs">{teacher.email}</span>}
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {editMode ? (
              <>
                <button type="button" onClick={handleSave} className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-indigo-600 shadow hover:bg-indigo-50">
                  Save changes
                </button>
                <button type="button" onClick={cancel} className="rounded-xl bg-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/30">
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setEditMode(true)} className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-indigo-600 shadow hover:bg-indigo-50">
                  Edit profile
                </button>
                <button type="button" onClick={onChangePassword} className="rounded-xl bg-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/30">
                  Change password
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Group title="Personal details" hint="Your name and personal information">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">{renderFields(PERSONAL)}</dl>
        </Group>

        <Group title="Contact and address" hint="Used for school communication">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">{renderFields(CONTACT)}</dl>
        </Group>

        <Group title="Qualifications" hint="Your degree and specialisation">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">{renderFields(QUALIFICATION)}</dl>
        </Group>

        <Group title="Emergency contact" hint="Who the school should call in an emergency">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">{renderFields(EMERGENCY)}</dl>
        </Group>

        <Group title="Employment" hint="Set by the school office. Ask the administrator to change these.">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">{renderFields(EMPLOYMENT, false)}</dl>
        </Group>

        <Group title="Health" hint="Shown to you for reference. Updated by the school office.">
          <dl className="grid grid-cols-1 gap-4">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Medical condition</dt>
              <dd className="mt-1 text-sm text-gray-800 dark:text-gray-100">{shown(teacher?.medical_condition)}</dd>
            </div>
          </dl>
        </Group>

        <Group title="Assigned classes" hint="Classes and subjects the school has given you" className="lg:col-span-2">
          {byClass.size === 0 ? (
            <p className="text-sm text-gray-400">No classes assigned yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[...byClass.values()].map((c) => (
                <div key={c.name} className="rounded-xl border border-gray-100 p-4 dark:border-slate-700">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{c.name}</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {c.subjects.length ? c.subjects.join(", ") : "No subject listed"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Group>
      </div>
    </div>
  );
}
