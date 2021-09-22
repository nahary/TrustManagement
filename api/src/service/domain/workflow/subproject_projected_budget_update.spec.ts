import { assert } from "chai";

import { Ctx } from "../../../lib/ctx";
import * as Result from "../../../result";
import { BusinessEvent } from "../business_event";
import { NotAuthorized } from "../errors/not_authorized";
import { NotFound } from "../errors/not_found";
import { ServiceUser } from "../organization/service_user";
import { Subproject } from "./subproject";
import { updateProjectedBudget } from "./subproject_projected_budget_update";

const ctx: Ctx = { requestId: "", source: "test" };
const address = "address";
const root: ServiceUser = { id: "root", groups: [], address };
const alice: ServiceUser = {
  id: "alice",
  groups: ["alice_and_bob", "alice_and_bob_and_charlie"],
  address,
};
const bob: ServiceUser = {
  id: "bob",
  groups: ["alice_and_bob", "alice_and_bob_and_charlie"],
  address,
};
const charlie: ServiceUser = { id: "charlie", groups: ["alice_and_bob_and_charlie"], address };
const projectId = "dummy-project";
const subprojectId = "dummy-subproject";
const baseSubproject: Subproject = {
  id: subprojectId,
  projectId,
  createdAt: new Date().toISOString(),
  status: "open",
  assignee: "alice",
  displayName: "dummy",
  description: "dummy",
  currency: "EUR",
  projectedBudgets: [],
  workflowitemOrdering: [],
  permissions: { "subproject.budget.updateProjected": [alice, bob, charlie].map((x) => x.id) },
  log: [],
  additionalData: {},
};
const baseRepository = {
  getUsersForIdentity: async (identity) => {
    if (identity === "alice") return ["alice"];
    if (identity === "bob") return ["bob"];
    if (identity === "charlie") return ["charlie"];
    if (identity === "alice_and_bob") return ["alice", "bob"];
    if (identity === "alice_and_bob_and_charlie") return ["alice", "bob", "charlie"];
    if (identity === "root") return ["root"];
    throw Error(`unexpected identity: ${identity}`);
  },
};

describe("Update subproject projected budget: permissions", () => {
  it("Without the subproject.budget.updateProjected permission, a user cannot update a projected budget.", async () => {
    const result = await updateProjectedBudget(
      ctx,
      alice,
      projectId,
      subprojectId,
      "Othertestcorp",
      "1000",
      "EUR",
      {
        ...baseRepository,
        getSubproject: async () => ({ ...baseSubproject, permissions: {} }),
      },
    );

    // NotAuthorized error due to the missing permissions:
    assert.isTrue(Result.isErr(result));
    assert.instanceOf(result, NotAuthorized);
  });

  it("The root user doesn't need permission to update a projected budget", async () => {
    const result = await updateProjectedBudget(
      ctx,
      root,
      projectId,
      subprojectId,
      "Othertestcorp",
      "1000",
      "EUR",
      {
        ...baseRepository,
        getSubproject: async () => ({
          ...baseSubproject,
          permissions: {},
          projectedBudgets: [
            {
              organization: "Testcorp",
              value: "10000",
              currencyCode: "EUR",
            },
          ],
        }),
      },
    );

    // No errors, despite the missing permissions:
    assert.isTrue(Result.isOk(result), (result as Error).message);
  });

  it("Updating a projected budget fails if the subproject cannot be found.", async () => {
    const result = await updateProjectedBudget(
      ctx,
      alice,
      projectId,
      subprojectId,
      "Othercorp",
      "10000",
      "EUR",
      {
        ...baseRepository,
        getSubproject: async () => new Error("some error"),
      },
    );

    // NotFound error as the subproject cannot be fetched:
    assert.isTrue(Result.isErr(result));
    assert.instanceOf(result, NotFound);
  });
});

describe("Update subproject projected budget: updating", () => {
  it("The projected budget is updated", async () => {
    const projectedBudgetToUpdate = {
      organization: "Otherestcorp",
      value: "10000",
      currencyCode: "EUR",
    };
    const updatedValue = "9999";
    const result = await updateProjectedBudget(
      ctx,
      alice,
      projectId,
      subprojectId,
      projectedBudgetToUpdate.organization,
      updatedValue,
      projectedBudgetToUpdate.currencyCode,
      {
        ...baseRepository,
        getSubproject: async () => ({
          ...baseSubproject,
          projectedBudgets: [
            {
              organization: projectedBudgetToUpdate.organization,
              value: projectedBudgetToUpdate.value,
              currencyCode: projectedBudgetToUpdate.currencyCode,
            },
          ],
        }),
      },
    );

    assert.isTrue(Result.isOk(result));
    if (Result.isErr(result)) {
      throw result;
    }
    const { projectedBudgets } = result;
    assert.equal(projectedBudgets[0].value, updatedValue);
  });
});

describe("Update Projected Budgets: notifications", () => {
  it("When a user updates a projected budget, a notification is issued to the assignee.", async () => {
    const result = await updateProjectedBudget(
      ctx,
      alice,
      projectId,
      subprojectId,
      "Testcorp",
      "9999",
      "EUR",
      {
        ...baseRepository,
        getSubproject: async () => ({
          ...baseSubproject,
          status: "open",
          assignee: bob.id,
          projectedBudgets: [
            {
              organization: "Testcorp",
              value: "10000",
              currencyCode: "EUR",
            },
          ],
        }),
      },
    );

    // A notification has been issued to the assignee:
    assert.isTrue(Result.isOk(result), (result as Error).message);
    // Make TypeScript happy:
    if (Result.isErr(result)) {
      throw result;
    }
    const { newEvents } = result;

    assert.isTrue(
      newEvents.some(
        (event) => event.type === "notification_created" && event.recipient === bob.id,
      ),
    );
  });

  it(
    "If the user that updates a projected budget is assigned " +
      "to the subproject herself,no notifications are issued.",
    async () => {
      const result = await updateProjectedBudget(
        ctx,
        alice,
        projectId,
        subprojectId,
        "Testcorp",
        "9999",
        "EUR",
        {
          ...baseRepository,
          getSubproject: async () => ({
            ...baseSubproject,
            status: "open",
            assignee: alice.id,
            projectedBudgets: [
              {
                organization: "Testcorp",
                value: "10000",
                currencyCode: "EUR",
              },
            ],
          }),
        },
      );

      // There is an event representing the operation, but no notification:
      assert.isTrue(Result.isOk(result), (result as Error).message);
      // Make TypeScript happy:
      if (Result.isErr(result)) {
        throw result;
      }
      const { newEvents } = result;
      assert.isTrue(newEvents.length > 0);
      assert.isFalse(newEvents.some((event) => event.type === "notification_created"));
    },
  );

  it(
    "If a subproject is assigned to a group when updating a projected budget, " +
      "each member, except for the user that updates it, receives a notificaton.",
    async () => {
      const group = "alice_and_bob_and_charlie";
      const result = await updateProjectedBudget(
        ctx,
        alice,
        projectId,
        subprojectId,
        "Testcorp",
        "999",
        "EUR",
        {
          ...baseRepository,
          getSubproject: async () => ({
            ...baseSubproject,
            status: "open",
            assignee: group,
            projectedBudgets: [
              {
                organization: "Testcorp",
                value: "10000",
                currencyCode: "EUR",
              },
            ],
          }),
        },
      );
      assert.isTrue(Result.isOk(result), (result as Error).message);
      // Make TypeScript happy:
      if (Result.isErr(result)) {
        throw result;
      }
      const { newEvents } = result;

      // A notification has been issued to both Bob and Charlie, but not to Alice, as she
      // is the user who updated the subproject:
      function isNotificationFor(userId: string): (e: BusinessEvent) => boolean {
        return (event) => event.type === "notification_created" && event.recipient === userId;
      }

      assert.isFalse(newEvents.some(isNotificationFor("alice")));
      assert.isTrue(newEvents.some(isNotificationFor("bob")));
      assert.isTrue(newEvents.some(isNotificationFor("charlie")));
    },
  );
});
