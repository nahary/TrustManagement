import { Ctx } from "../lib/ctx";
import * as Cache2 from "./cache2";
import { ConnToken } from "./conn";
import { ServiceUser } from "./domain/organization/service_user";
import { CurrencyCode, MoneyAmount } from "./domain/workflow/money";
import * as Project from "./domain/workflow/project";
import * as ProjectProjectedBudgetUpdate from "./domain/workflow/project_projected_budget_update";
import { ProjectedBudget } from "./domain/workflow/projected_budget";
import { store } from "./store";

export async function updateProjectedBudget(
  conn: ConnToken,
  ctx: Ctx,
  serviceUser: ServiceUser,
  projectId: Project.Id,
  organization: string,
  value: MoneyAmount,
  currencyCode: CurrencyCode,
): Promise<ProjectedBudget[]> {
  const {
    newEvents,
    newState: projectedBudgets,
    errors,
  } = await ProjectProjectedBudgetUpdate.updateProjectedBudget(
    ctx,
    serviceUser,
    projectId,
    organization,
    value,
    currencyCode,
    {
      getProjectEvents: async () => {
        await Cache2.refresh(conn, projectId);
        return conn.cache2.eventsByStream.get(projectId) || [];
      },
    },
  );
  if (errors.length > 0) return Promise.reject(errors);
  if (!newEvents.length) {
    return Promise.reject(`Generating events failed: ${JSON.stringify(newEvents)}`);
  }

  for (const event of newEvents) {
    await store(conn, ctx, event);
  }

  return projectedBudgets;
}
