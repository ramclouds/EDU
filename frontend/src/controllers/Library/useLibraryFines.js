import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { BASE_URL } from "../../config/appConfig";

const EMPTY_FILTERS = {
  search: "",
  member_type: "",
  status: "",
  date_from: "",
  date_to: "",
};

const EMPTY_STATS = {
  total_fines: 0,
  pending_count: 0,
  partially_paid_count: 0,
  paid_count: 0,
  waived_count: 0,
  pending_amount: 0,
  collected_amount: 0,
  waived_amount: 0,
};

const EMPTY_PAGINATION = {
  page: 1,
  per_page: 10,
  total: 0,
  pages: 1,
  has_prev: false,
  has_next: false,
};

const EMPTY_ACTION_FORM = {
  action: "collect",
  amount: "",
  payment_method: "Cash",
  reference_no: "",
  remarks: "",
};

export function useLibraryFines({
  activeSection,
  fetchWithAuth,
  showToast,
}) {
  const fetchRef = useRef(fetchWithAuth);
  const toastRef = useRef(showToast);
  const listRunningRef = useRef(false);
  const detailsRunningRef = useRef(false);
  const sectionLoadedRef = useRef(false);

  const [
    fineRows,
    setFineRows,
  ] = useState([]);

  const [
    fineFilters,
    setFineFilters,
  ] = useState({
    ...EMPTY_FILTERS,
  });

  const [
    fineStats,
    setFineStats,
  ] = useState({
    ...EMPTY_STATS,
  });

  const [
    finePagination,
    setFinePagination,
  ] = useState({
    ...EMPTY_PAGINATION,
  });

  const [
    finesLoading,
    setFinesLoading,
  ] = useState(false);

  const [
    finesExporting,
    setFinesExporting,
  ] = useState(false);

  const [
    selectedFine,
    setSelectedFine,
  ] = useState(null);

  const [
    fineDetails,
    setFineDetails,
  ] = useState(null);

  const [
    fineDetailsLoading,
    setFineDetailsLoading,
  ] = useState(false);

  const [
    fineDetailsOpen,
    setFineDetailsOpen,
  ] = useState(false);

  const [
    fineActionOpen,
    setFineActionOpen,
  ] = useState(false);

  const [
    fineActionSaving,
    setFineActionSaving,
  ] = useState(false);

  const [
    fineActionForm,
    setFineActionForm,
  ] = useState({
    ...EMPTY_ACTION_FORM,
  });

  const [
    fineActionErrors,
    setFineActionErrors,
  ] = useState({});

  useEffect(() => {
    fetchRef.current =
      fetchWithAuth;
  }, [fetchWithAuth]);

  useEffect(() => {
    toastRef.current =
      showToast;
  }, [showToast]);

  const notify = useCallback(
    (message, type = "info") => {
      toastRef.current?.(
        message,
        type
      );
    },
    []
  );

  const request = useCallback(
    async (url, options = {}) => {
      if (
        typeof fetchRef.current !==
        "function"
      ) {
        throw new Error(
          "Authenticated request unavailable"
        );
      }

      const response =
        await fetchRef.current(
          url,
          options
        );

      let data = {};

      try {
        data =
          await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        const error = new Error(
          data.error ||
            data.message ||
            `Request failed (${response.status})`
        );

        error.data = data;
        error.status =
          response.status;

        throw error;
      }

      return data;
    },
    []
  );

  const loadFines = useCallback(
    async ({
      page = 1,
      perPage = 10,
      filters = EMPTY_FILTERS,
      silent = false,
    } = {}) => {
      if (
        listRunningRef.current
      ) {
        return;
      }

      listRunningRef.current =
        true;

      setFinesLoading(true);

      try {
        const params =
          new URLSearchParams();

        params.set(
          "page",
          String(page)
        );

        params.set(
          "per_page",
          String(perPage)
        );

        Object.entries(
          filters
        ).forEach(
          ([key, value]) => {
            const normalized =
              String(
                value ?? ""
              ).trim();

            if (normalized) {
              params.set(
                key,
                normalized
              );
            }
          }
        );

        const data =
          await request(
            `${BASE_URL}/admin/library/fines?${params.toString()}`
          );

        setFineRows(
          Array.isArray(
            data.fines
          )
            ? data.fines
            : []
        );

        setFineStats({
          ...EMPTY_STATS,
          ...(data.stats || {}),
        });

        setFinePagination({
          ...EMPTY_PAGINATION,
          ...(data.pagination ||
            {}),
          pages: Math.max(
            Number(
              data.pagination
                ?.pages
            ) || 1,
            1
          ),
        });
      } catch (error) {
        console.error(
          "Load fines error:",
          error
        );

        if (!silent) {
          notify(
            error.message ||
              "Failed to load fines",
            "error"
          );
        }
      } finally {
        listRunningRef.current =
          false;

        setFinesLoading(false);
      }
    },
    [notify, request]
  );

  const updateFineFilter =
    useCallback(
      (name, value) => {
        setFineFilters(
          (current) => ({
            ...current,
            [name]: value,
          })
        );
      },
      []
    );

  const applyFineFilters =
    useCallback(() => {
      loadFines({
        page: 1,
        perPage:
          finePagination.per_page,
        filters: fineFilters,
      });
    }, [
      fineFilters,
      finePagination.per_page,
      loadFines,
    ]);

  const resetFineFilters =
    useCallback(() => {
      const filters = {
        ...EMPTY_FILTERS,
      };

      setFineFilters(filters);

      loadFines({
        page: 1,
        perPage:
          finePagination.per_page,
        filters,
      });
    }, [
      finePagination.per_page,
      loadFines,
    ]);

  const changeFinePage =
    useCallback(
      (page) => {
        if (
          page < 1 ||
          page >
            finePagination.pages
        ) {
          return;
        }

        loadFines({
          page,
          perPage:
            finePagination.per_page,
          filters: fineFilters,
        });
      },
      [
        fineFilters,
        finePagination.pages,
        finePagination.per_page,
        loadFines,
      ]
    );

  const loadFineDetails =
    useCallback(
      async (
        memberType,
        issueId
      ) => {
        if (
          detailsRunningRef.current
        ) {
          return null;
        }

        detailsRunningRef.current =
          true;

        setFineDetailsLoading(true);

        try {
          const data =
            await request(
              `${BASE_URL}/admin/library/fines/${memberType}/${issueId}`
            );

          setFineDetails(data);

          return data;
        } catch (error) {
          notify(
            error.message ||
              "Failed to load fine details",
            "error"
          );

          throw error;
        } finally {
          detailsRunningRef.current =
            false;

          setFineDetailsLoading(
            false
          );
        }
      },
      [notify, request]
    );

  const openFineDetails =
    useCallback(
      async (fine) => {
        setSelectedFine(fine);
        setFineDetails(null);
        setFineDetailsOpen(true);

        try {
          await loadFineDetails(
            fine.member_type,
            fine.issue_id
          );
        } catch {
          // Error already handled.
        }
      },
      [loadFineDetails]
    );

  const closeFineDetails =
    useCallback(() => {
      setSelectedFine(null);
      setFineDetails(null);
      setFineDetailsOpen(false);
    }, []);

  const openFineAction =
    useCallback(
      (
        fine,
        action = "collect"
      ) => {
        const pendingAmount =
          Number(
            fine.pending_amount ||
              0
          );

        setSelectedFine(fine);

        setFineActionForm({
          ...EMPTY_ACTION_FORM,
          action,
          amount:
            pendingAmount > 0
              ? String(
                  pendingAmount
                )
              : "",
          payment_method:
            action === "waive"
              ? "Waiver"
              : "Cash",
        });

        setFineActionErrors({});
        setFineActionOpen(true);
      },
      []
    );

  const closeFineAction =
    useCallback(() => {
      if (fineActionSaving) {
        return;
      }

      setFineActionOpen(false);
      setFineActionErrors({});

      setFineActionForm({
        ...EMPTY_ACTION_FORM,
      });
    }, [fineActionSaving]);

  const updateFineActionForm =
    useCallback(
      (name, value) => {
        setFineActionForm(
          (current) => ({
            ...current,
            [name]: value,
          })
        );

        setFineActionErrors(
          (current) => {
            const updated = {
              ...current,
            };

            delete updated[name];

            return updated;
          }
        );
      },
      []
    );

  const saveFineAction =
    useCallback(
      async (event) => {
        event?.preventDefault();

        if (
          fineActionSaving ||
          !selectedFine
        ) {
          return;
        }

        const errors = {};

        const amount = Number(
          fineActionForm.amount
        );

        if (
          !Number.isFinite(amount) ||
          amount <= 0
        ) {
          errors.amount =
            "Enter a valid amount";
        }

        if (
          amount >
          Number(
            selectedFine.pending_amount ||
              0
          )
        ) {
          errors.amount =
            "Amount cannot exceed pending fine";
        }

        if (
          fineActionForm.action ===
            "collect" &&
          !fineActionForm
            .payment_method
        ) {
          errors.payment_method =
            "Select payment method";
        }

        if (
          fineActionForm.action ===
            "waive" &&
          !fineActionForm.remarks.trim()
        ) {
          errors.remarks =
            "Waiver reason is required";
        }

        if (
          Object.keys(errors)
            .length
        ) {
          setFineActionErrors(
            errors
          );

          return;
        }

        setFineActionSaving(true);

        try {
          const data =
            await request(
              `${BASE_URL}/admin/library/fines/${selectedFine.member_type}/${selectedFine.issue_id}/action`,
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body: JSON.stringify({
                  ...fineActionForm,
                  amount,
                  reference_no:
                    fineActionForm
                      .reference_no
                      .trim() ||
                    null,
                  remarks:
                    fineActionForm
                      .remarks
                      .trim() ||
                    null,
                }),
              }
            );

          notify(
            data.message ||
              "Fine updated successfully",
            "success"
          );

          setFineActionOpen(false);

          await loadFines({
            page:
              finePagination.page,
            perPage:
              finePagination.per_page,
            filters: fineFilters,
            silent: true,
          });

          if (
            fineDetailsOpen
          ) {
            await loadFineDetails(
              selectedFine.member_type,
              selectedFine.issue_id
            );
          }
        } catch (error) {
          if (
            error.data?.errors
          ) {
            setFineActionErrors(
              error.data.errors
            );
          }

          notify(
            error.message ||
              "Failed to update fine",
            "error"
          );
        } finally {
          setFineActionSaving(
            false
          );
        }
      },
      [
        fineActionForm,
        fineActionSaving,
        fineDetailsOpen,
        fineFilters,
        finePagination.page,
        finePagination.per_page,
        loadFineDetails,
        loadFines,
        notify,
        request,
        selectedFine,
      ]
    );

  const exportFineReport =
    useCallback(async () => {
      if (finesExporting) {
        return;
      }

      setFinesExporting(true);

      try {
        const params =
          new URLSearchParams();

        params.set("export", "csv");

        Object.entries(
          fineFilters
        ).forEach(
          ([key, value]) => {
            const normalized =
              String(
                value ?? ""
              ).trim();

            if (normalized) {
              params.set(
                key,
                normalized
              );
            }
          }
        );

        const response =
          await fetchRef.current(
            `${BASE_URL}/admin/library/fines?${params.toString()}`,
            {
              method: "GET",
              headers: {
                Accept: "text/csv",
              },
            }
          );

        if (!response.ok) {
          throw new Error(
            "Failed to export fine report"
          );
        }

        const blob =
          await response.blob();

        const disposition =
          response.headers.get(
            "Content-Disposition"
          );

        const match =
          disposition?.match(
            /filename="?([^"]+)"?/i
          );

        const filename =
          match?.[1] ||
          `library-fine-report-${new Date()
            .toISOString()
            .slice(0, 10)}.csv`;

        const url =
          URL.createObjectURL(
            blob
          );

        const anchor =
          document.createElement(
            "a"
          );

        anchor.href = url;
        anchor.download =
          filename;

        document.body.appendChild(
          anchor
        );

        anchor.click();
        anchor.remove();

        URL.revokeObjectURL(url);

        notify(
          "Filtered fine report exported successfully",
          "success"
        );
      } catch (error) {
        notify(
          error.message ||
            "Failed to export report",
          "error"
        );
      } finally {
        setFinesExporting(
          false
        );
      }
    }, [
      fineFilters,
      finesExporting,
      notify,
    ]);

  useEffect(() => {
    if (
      activeSection !== "fines"
    ) {
      sectionLoadedRef.current =
        false;

      return;
    }

    if (
      sectionLoadedRef.current
    ) {
      return;
    }

    sectionLoadedRef.current =
      true;

    loadFines({
      page: 1,
      perPage: 10,
      filters: {
        ...EMPTY_FILTERS,
      },
    });
  }, [
    activeSection,
    loadFines,
  ]);

  return {
    fineRows,
    fineFilters,
    fineStats,
    finePagination,

    finesLoading,
    finesExporting,

    selectedFine,
    fineDetails,
    fineDetailsLoading,
    fineDetailsOpen,

    fineActionOpen,
    fineActionSaving,
    fineActionForm,
    fineActionErrors,

    loadFines,
    updateFineFilter,
    applyFineFilters,
    resetFineFilters,
    changeFinePage,

    openFineDetails,
    closeFineDetails,

    openFineAction,
    closeFineAction,
    updateFineActionForm,
    saveFineAction,

    exportFineReport,
  };
}