import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, Search } from "lucide-react";
import { adminFetch, qs } from "../api/client";
import { dateTime, pkr } from "../lib/format";
import { Badge, Card, Loading, Spinner } from "../components/ui";
import PageHeader from "../components/PageHeader";

interface Txn {
  id: string;
  userEmail: string;
  kind: string;
  name: string;
  amount: number;
  category: string;
  method: string;
  date: string;
}
interface Page {
  items: Txn[];
  nextCursor: string | null;
}

export default function Transactions() {
  const [userId, setUserId] = useState("");
  const [applied, setApplied] = useState("");

  const q = useInfiniteQuery<Page>({
    queryKey: ["transactions", applied],
    queryFn: ({ pageParam }) =>
      adminFetch(`/transactions${qs({ userId: applied, limit: 50, cursor: pageParam })}`),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const rows = q.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <>
      <PageHeader title="Signal Feed" sub="Read-only global transaction stream · support triage" />

      <Card style={{ marginBottom: 16 }}>
        <form
          className="wrap-gap"
          onSubmit={(e) => {
            e.preventDefault();
            setApplied(userId.trim());
          }}
        >
          <div className="row" style={{ flex: 1, minWidth: 240, position: "relative" }}>
            <Search size={15} style={{ position: "absolute", left: 12, color: "var(--text-faint)" }} />
            <input
              className="input"
              style={{ paddingLeft: 34 }}
              placeholder="Filter by user ID…"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          </div>
          <button className="btn btn-sm">Apply</button>
          {applied && (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => {
                setUserId("");
                setApplied("");
              }}
            >
              Clear
            </button>
          )}
        </form>
      </Card>

      <Card pad={false}>
        {q.isLoading ? (
          <Loading />
        ) : rows.length === 0 ? (
          <div className="card-pad muted">No transactions.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>User</th>
                  <th>Category</th>
                  <th>Method</th>
                  <th>When</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => {
                  const inflow = t.kind === "income";
                  return (
                    <tr key={t.id} style={{ cursor: "default" }}>
                      <td>
                        <div className="row">
                          {inflow ? (
                            <ArrowDownLeft size={15} style={{ color: "var(--lime)" }} />
                          ) : (
                            <ArrowUpRight size={15} style={{ color: "var(--magenta)" }} />
                          )}
                          <span style={{ fontWeight: 600 }}>{t.name}</span>
                        </div>
                      </td>
                      <td className="mono">{t.userEmail}</td>
                      <td><Badge kind="dim">{t.category}</Badge></td>
                      <td className="muted">{t.method}</td>
                      <td className="muted">{dateTime(t.date)}</td>
                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                          color: inflow ? "var(--lime)" : "var(--text)",
                        }}
                      >
                        {inflow ? "+" : "−"}
                        {pkr(t.amount).replace("PKR", "").trim()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {q.hasNextPage && (
          <div className="card-pad" style={{ textAlign: "center" }}>
            <button className="btn btn-sm" onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage}>
              {q.isFetchingNextPage ? <Spinner /> : "Load more"}
            </button>
          </div>
        )}
      </Card>
    </>
  );
}
