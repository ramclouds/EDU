import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  BASE_URL,
} from "../config/appConfig";

export function useStudentDashboard(
  activeSection,
  setActiveSection,
) {
  // =========================================================
  // REFS
  // =========================================================
  const toastTimerRef =
    useRef(null);

  const notificationRunningRef =
    useRef(false);

  // =========================================================
  // LOADING
  // =========================================================
  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    noticeLoading,
    setNoticeLoading,
  ] = useState(false);

  // =========================================================
  // NOTIFICATIONS
  // =========================================================
  const [
    notifications,
    setNotifications,
  ] = useState([]);

  const [
    notificationUnread,
    setNotificationUnread,
  ] = useState(0);

  const [
    notificationLoading,
    setNotificationLoading,
  ] = useState(false);

  // =========================================================
  // ANNOUNCEMENTS
  // =========================================================
  const [
    announcements,
    setNotices,
  ] = useState([]);

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);

  const [
    noticeStats,
    setNoticeStats,
  ] = useState({
    total: 0,
    important: 0,
    thisWeek: 0,
  });

  // =========================================================
  // TOAST
  // =========================================================
  const [
    toast,
    setToast,
  ] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const showToast =
    useCallback(
      (
        message,
        type = "success",
      ) => {
        if (
          toastTimerRef.current
        ) {
          clearTimeout(
            toastTimerRef.current,
          );
        }

        setToast({
          show: true,
          message,
          type,
        });

        toastTimerRef.current =
          setTimeout(() => {
            setToast({
              show: false,
              message: "",
              type,
            });
          }, 3000);
      },
      [],
    );

  // =========================================================
  // AUTH
  // =========================================================
  const getAuth =
    useCallback(() => {
      try {
        const rawUser =
          localStorage.getItem(
            "user",
          );

        return {
          user: rawUser
            ? JSON.parse(rawUser)
            : null,

          token:
            localStorage.getItem(
              "token",
            ),
        };
      } catch (error) {
        console.error(
          "Failed to parse auth:",
          error,
        );

        return {
          user: null,
          token: null,
        };
      }
    }, []);

  const logoutUser =
    useCallback(() => {
      localStorage.clear();

      window.location.href = "/";
    }, []);

  // =========================================================
  // AUTHENTICATED FETCH
  // =========================================================
  const fetchWithAuth =
    useCallback(
      async (
        url,
        options = {},
      ) => {
        const { token } =
          getAuth();

        if (!token) {
          logoutUser();

          throw new Error(
            "Authentication token missing",
          );
        }

        const headers = {
          ...(options.headers ||
            {}),

          Authorization:
            `Bearer ${token}`,
        };

        /*
         * Do not force Content-Type for FormData.
         * Browser needs to generate multipart boundary.
         */
        if (
          options.body &&
          !(options.body
            instanceof FormData) &&
          !headers[
          "Content-Type"
          ]
        ) {
          headers[
            "Content-Type"
          ] = "application/json";
        }

        const response =
          await fetch(
            url,
            {
              ...options,
              headers,
            },
          );

        if (
          response.status ===
          401
        ) {
          logoutUser();

          throw new Error(
            "Unauthorized",
          );
        }

        return response;
      },
      [
        getAuth,
        logoutUser,
      ],
    );

  // =========================================================
  // AUTH CHECK
  // =========================================================
  useEffect(() => {
    const {
      user,
      token,
    } = getAuth();

    if (!user || !token) {
      logoutUser();
    }
  }, [
    getAuth,
    logoutUser,
  ]);

  // =========================================================
  // LOAD ANNOUNCEMENTS
  // =========================================================
  const fetchAnnouncements =
    useCallback(
      async ({
        silent = false,
      } = {}) => {
        const { user } =
          getAuth();

        if (!user?.id) {
          return;
        }

        if (!silent) {
          setNoticeLoading(
            true,
          );
        }

        try {
          const response =
            await fetchWithAuth(
              `${BASE_URL}/announcements/student/${user.id}?page=1&limit=20`,
            );

          let data = {};

          try {
            data =
              await response.json();
          } catch {
            data = {};
          }

          if (!response.ok) {
            throw new Error(
              data.error ||
              data.message ||
              "Unable to load announcements",
            );
          }

          const notices =
            Array.isArray(
              data.data,
            )
              ? data.data
              : Array.isArray(data)
                ? data
                : [];

          setNotices(notices);

          setUnreadCount(
            notices.filter(
              (notice) =>
                !notice.is_read,
            ).length,
          );
        } catch (error) {
          console.error(
            "Announcement fetch error:",
            error,
          );

          if (!silent) {
            showToast(
              error.message ||
              "Failed to load announcements",
              "error",
            );
          }
        } finally {
          if (!silent) {
            setNoticeLoading(
              false,
            );
          }
        }
      },
      [
        fetchWithAuth,
        getAuth,
        showToast,
      ],
    );

  // =========================================================
  // DASHBOARD INITIAL DATA
  //
  // IMPORTANT:
  // Library fetching is intentionally NOT here anymore.
  // useStudentLibrary owns library data.
  // =========================================================
  useEffect(() => {
    let cancelled = false;

    const loadDashboard =
      async () => {
        try {
          setLoading(true);

          await fetchAnnouncements({
            silent: true,
          });
        } catch (error) {
          console.error(
            "Dashboard fetch error:",
            error,
          );
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [
    fetchAnnouncements,
  ]);

  // =========================================================
  // ANNOUNCEMENTS TAB
  // =========================================================
  useEffect(() => {
    if (
      activeSection !==
      "announcements"
    ) {
      return;
    }

    fetchAnnouncements({
      silent: true,
    });
  }, [
    activeSection,
    fetchAnnouncements,
  ]);

  // =========================================================
  // NOTIFICATIONS
  // =========================================================
  const fetchNotifications =
    useCallback(
      async ({
        silent = true,
      } = {}) => {
        if (
          notificationRunningRef
            .current
        ) {
          return;
        }

        notificationRunningRef.current =
          true;

        if (!silent) {
          setNotificationLoading(
            true,
          );
        }

        try {
          const response =
            await fetchWithAuth(
              `${BASE_URL}/notifications`,
            );

          let data = [];

          try {
            data =
              await response.json();
          } catch {
            data = [];
          }

          if (!response.ok) {
            throw new Error(
              data?.error ||
              data?.message ||
              "Failed to load notifications",
            );
          }

          const rows =
            Array.isArray(data)
              ? data
              : Array.isArray(
                data.notifications,
              )
                ? data.notifications
                : [];

          const sorted = [
            ...rows,
          ].sort(
            (a, b) => {
              if (
                Boolean(
                  a.is_read,
                ) !==
                Boolean(
                  b.is_read,
                )
              ) {
                return a.is_read
                  ? 1
                  : -1;
              }

              const timeA =
                new Date(
                  a.created_at ||
                  0,
                ).getTime();

              const timeB =
                new Date(
                  b.created_at ||
                  0,
                ).getTime();

              return (
                timeB -
                timeA
              );
            },
          );

          setNotifications(
            sorted,
          );

          setNotificationUnread(
            sorted.filter(
              (notification) =>
                !notification.is_read,
            ).length,
          );
        } catch (error) {
          console.error(
            "Notification fetch error:",
            error,
          );
        } finally {
          notificationRunningRef.current =
            false;

          if (!silent) {
            setNotificationLoading(
              false,
            );
          }
        }
      },
      [fetchWithAuth],
    );

  // Initial notification load + polling.
  useEffect(() => {
    fetchNotifications({
      silent: false,
    });

    const interval =
      setInterval(() => {
        fetchNotifications({
          silent: true,
        });
      }, 15000);

    return () => {
      clearInterval(
        interval,
      );
    };
  }, [
    fetchNotifications,
  ]);

  // =========================================================
  // MARK NOTIFICATION READ
  // =========================================================
  const markNotificationRead =
    useCallback(
      async (id) => {
        if (!id) {
          return;
        }

        try {
          const response =
            await fetchWithAuth(
              `${BASE_URL}/notifications/read/${id}`,
              {
                method: "POST",
              },
            );

          if (!response.ok) {
            let data = {};

            try {
              data =
                await response.json();
            } catch {
              data = {};
            }

            throw new Error(
              data.error ||
              data.message ||
              "Unable to mark notification as read",
            );
          }

          setNotifications(
            (previous) =>
              previous.map(
                (notification) =>
                  notification.id ===
                    id
                    ? {
                      ...notification,
                      is_read:
                        true,
                    }
                    : notification,
              ),
          );

          setNotificationUnread(
            (previous) =>
              Math.max(
                previous - 1,
                0,
              ),
          );
        } catch (error) {
          console.error(
            "Mark notification error:",
            error,
          );
        }
      },
      [fetchWithAuth],
    );

  // =========================================================
  // MARK ANNOUNCEMENT READ
  // =========================================================
  const markNoticeAsRead =
    useCallback(
      async (
        noticeId,
      ) => {
        const { user } =
          getAuth();

        if (
          !noticeId ||
          !user?.id
        ) {
          return;
        }

        try {
          const response =
            await fetchWithAuth(
              `${BASE_URL}/announcements/read/${noticeId}/${user.id}`,
              {
                method: "POST",
              },
            );

          if (!response.ok) {
            let data = {};

            try {
              data =
                await response.json();
            } catch {
              data = {};
            }

            throw new Error(
              data.error ||
              data.message ||
              "Unable to mark announcement as read",
            );
          }

          setNotices(
            (previous) =>
              previous.map(
                (notice) =>
                  notice.id ===
                    noticeId
                    ? {
                      ...notice,
                      is_read:
                        true,
                    }
                    : notice,
              ),
          );

          setUnreadCount(
            (previous) =>
              Math.max(
                previous - 1,
                0,
              ),
          );
        } catch (error) {
          console.error(
            "Mark announcement error:",
            error,
          );
        }
      },
      [
        fetchWithAuth,
        getAuth,
      ],
    );

  // =========================================================
  // COMBINED NOTIFICATION CENTER
  // =========================================================
  const combinedNotifications =
    useMemo(
      () => [
        ...(notifications ||
          []).map(
            (notification) => ({
              ...notification,

              source:
                "notification",

              time:
                notification.created_at,

              title:
                notification.title ||
                "Notification",

              message:
                notification.message ||
                "",
            }),
          ),

        ...(announcements ||
          []).map(
            (announcement) => ({
              ...announcement,

              source:
                "notice",

              time:
                announcement.date ||
                announcement.created_at,

              title:
                announcement.title ||
                "Announcement",

              message:
                announcement.description ||
                announcement.message ||
                "",
            }),
          ),
      ],
      [
        announcements,
        notifications,
      ],
    );

  const sortedNotifications =
    useMemo(
      () =>
        [
          ...combinedNotifications,
        ].sort(
          (a, b) => {
            if (
              Boolean(
                a.is_read,
              ) !==
              Boolean(
                b.is_read,
              )
            ) {
              return a.is_read
                ? 1
                : -1;
            }

            return (
              new Date(
                b.time || 0,
              ).getTime() -
              new Date(
                a.time || 0,
              ).getTime()
            );
          },
        ),
      [
        combinedNotifications,
      ],
    );

  const totalUnread =
    useMemo(
      () =>
        (notifications?.filter(
          (notification) =>
            !notification.is_read,
        ).length || 0) +
        (announcements?.filter(
          (announcement) =>
            !announcement.is_read,
        ).length || 0),
      [
        announcements,
        notifications,
      ],
    );

  // =========================================================
  // NOTIFICATION CLICK
  // =========================================================
  const handleNotificationClick =
    useCallback(
      async (item) => {
        if (!item) {
          return;
        }

        if (
          item.source ===
          "notice"
        ) {
          if (!item.is_read) {
            await markNoticeAsRead(
              item.id,
            );
          }

          setActiveSection(
            "announcements",
          );

          return;
        }

        if (!item.is_read) {
          await markNotificationRead(
            item.id,
          );
        }

        /*
         * Library notifications should open Library.
         */
        if (
          [
            "overdue",
            "fine",
            "return_reminder",
          ].includes(
            String(
              item.type || "",
            ).toLowerCase(),
          )
        ) {
          setActiveSection(
            "library",
          );

          return;
        }

        /*
         * Generic notifications are shown in
         * Announcements / Notifications center.
         */
        setActiveSection(
          "announcements",
        );
      },
      [
        markNoticeAsRead,
        markNotificationRead,
        setActiveSection,
      ],
    );

  // =========================================================
  // NOTICE STATS
  // =========================================================
  useEffect(() => {
    if (
      activeSection !==
      "announcements"
    ) {
      return;
    }

    const total =
      announcements.length;

    const important =
      announcements.filter(
        (notice) =>
          notice.priority ===
          "High",
      ).length;

    const now =
      new Date();

    const thisWeek =
      announcements.filter(
        (notice) => {
          if (!notice.date) {
            return false;
          }

          const noticeDate =
            new Date(
              notice.date,
            );

          if (
            Number.isNaN(
              noticeDate.getTime(),
            )
          ) {
            return false;
          }

          const difference =
            (now.getTime() -
              noticeDate.getTime()) /
            (
              1000 *
              60 *
              60 *
              24
            );

          return (
            difference >= 0 &&
            difference <= 7
          );
        },
      ).length;

    setNoticeStats({
      total,
      important,
      thisWeek,
    });
  }, [
    activeSection,
    announcements,
  ]);

  // =========================================================
  // CLEANUP
  // =========================================================
  useEffect(
    () => () => {
      if (
        toastTimerRef.current
      ) {
        clearTimeout(
          toastTimerRef.current,
        );
      }
    },
    [],
  );

  // =========================================================
  // RETURN
  // =========================================================
  return {
    loading,
    noticeLoading,

    announcements,
    unreadCount,
    noticeStats,

    notifications,
    notificationUnread,
    notificationLoading,

    combinedNotifications,
    sortedNotifications,
    totalUnread,

    handleNotificationClick,

    markNotificationRead,
    markNoticeAsRead,

    fetchAnnouncements,
    fetchNotifications,

    toast,

    fetchWithAuth,
    showToast,
  };
}