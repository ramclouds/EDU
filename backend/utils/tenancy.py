"""Shared multi-tenancy helpers.

Every module that scopes data by school used to carry its own copy of
`_current_school_id()`; the ownership checks for "student id / teacher id
in the URL" endpoints were being re-implemented per file, which is how a
legacy-install regression slipped into the attendance module. Keeping the
rules in one place means they can't drift apart.

Semantics (important, easy to get wrong):
  * school_id None means "legacy / unscoped install". None == None is a
    MATCH — a single-school install that never onboarded through the
    Developer dashboard must keep working exactly as before.
  * A real school_id only ever matches the same school_id, never None and
    never another school.
"""

from flask import request

from utils.auth import Student, Teacher


def current_school_id():
    return getattr(getattr(request, "user", None), "school_id", None)


def caller_can_access_student(student_id):
    """(allowed, student). Allowed when the caller IS this student, or is
    non-student staff at the same school as the student.

    Endpoints that take a student id from the URL are called both by the
    student themself and by admins/teachers looking someone up, so a
    pure self-only rule would break legitimate use. Returns
    (False, None) for an unknown id — callers should answer 404/403
    identically so the response never reveals whether an id exists at
    another school."""
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
    """(allowed, teacher). Allowed when the caller IS this teacher, or is
    non-teacher staff (admin etc.) at the same school. Teachers looking
    at other teachers is not allowed."""
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
