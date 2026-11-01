"""DNS TXT lookup, used to prove a school owns a custom domain.

Needs the `dnspython` package. Tests replace lookup_txt() with a stub.
"""


class DnsUnavailable(Exception):
    """dnspython is not installed."""


class DnsLookupError(Exception):
    """The lookup failed for a reason other than 'no such record'."""


def lookup_txt(name):
    """All TXT strings published at `name` (empty list when there are none)."""
    try:
        import dns.exception
        import dns.resolver
    except ImportError as exc:
        raise DnsUnavailable("dnspython is not installed") from exc

    try:
        answers = dns.resolver.resolve(name, "TXT", lifetime=5.0)
    except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer):
        return []
    except dns.exception.DNSException as exc:
        raise DnsLookupError(str(exc)) from exc

    values = []
    for record in answers:
        values.append(
            "".join(
                part.decode("utf-8", "ignore") if isinstance(part, bytes) else str(part)
                for part in record.strings
            )
        )
    return values
