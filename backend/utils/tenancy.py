from flask import request

from utils.auth import Admin, Student, Teacher


def current_school_id():
    return getattr(getattr(request, "user", None), "school_id", None)


def caller_can_access_student(student_id):

    try:
        student_id = int(student_id)
    except (TypeError, ValueError):
        return False, None

    caller = getattr(request, "user", None)
    student = Student.query.get(student_id)

    if caller is None or student is None:
        return False, None

    if isinstance(caller, Student):
        return caller.id == student.id, student

    return (
        getattr(caller, "school_id", None) == student.school_id,
        student,
    )


def caller_can_access_teacher(teacher_id):

    try:
        teacher_id = int(teacher_id)
    except (TypeError, ValueError):
        return False, None

    caller = getattr(request, "user", None)
    teacher = Teacher.query.get(teacher_id)

    if caller is None or teacher is None:
        return False, None

    if isinstance(caller, Teacher):
        return caller.id == teacher.id, teacher

    if isinstance(caller, Student):
        return False, teacher

    return (
        getattr(caller, "school_id", None) == teacher.school_id,
        teacher,
    )


def caller_can_manage_admin(target_admin):
    """Self, or a Super Admin at the same school. Other admins are refused."""
    caller = getattr(request, "user", None)
    if not isinstance(caller, Admin) or target_admin is None:
        return False
    if caller.id == target_admin.id:
        return True
    return caller.role == "super_admin" and caller.school_id == target_admin.school_id
