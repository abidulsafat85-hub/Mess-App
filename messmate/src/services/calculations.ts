import {
  Member,
  MealRecord,
  BazarExpense,
  Deposit,
  FixedExpense,
  MessSettings,
  MonthlyAccountingSummary,
  MemberMonthlyCalculation,
} from '../types';

export function calculateMonthlySummary(
  month: string, // YYYY-MM
  members: Member[],
  meals: MealRecord[],
  bazar: BazarExpense[],
  deposits: Deposit[],
  fixedExpenses: FixedExpense[],
  settings: MessSettings
): MonthlyAccountingSummary {
  // 1. Filter records for the specified month
  const monthMeals = meals.filter((m) => m.date.startsWith(month));
  const monthBazar = bazar.filter((b) => b.date.startsWith(month));
  const monthDeposits = deposits.filter((d) => d.date.startsWith(month));
  const monthFixed = fixedExpenses.filter((f) => f.month === month);

  // 2. Active members in this month
  // Include members who are active OR who have meals/deposits in this month
  const relevantMembers = members.filter((m) => {
    if (m.isActive) return true;
    const hasMeals = monthMeals.some((meal) => meal.memberId === m.id && meal.mealCount > 0);
    const hasDeposit = monthDeposits.some((dep) => dep.memberId === m.id);
    return hasMeals || hasDeposit;
  });

  const activeMemberCount = relevantMembers.length || 1;

  // 3. Totals
  const totalMeals = monthMeals.reduce((acc, m) => acc + (Number(m.mealCount) || 0), 0);
  const totalBazarCost = monthBazar.reduce((acc, b) => acc + (Number(b.amount) || 0), 0);
  const totalFixedExpenses = monthFixed.reduce((acc, f) => acc + (Number(f.amount) || 0), 0);
  const totalExpenses = totalBazarCost + totalFixedExpenses;

  // 4. Meal Rate Calculation
  let mealRate = 0;
  let sharedFixedPerMember = 0;

  if (settings.showBazarOption === false && settings.fixedMealRate && settings.fixedMealRate > 0) {
    mealRate = settings.fixedMealRate;
    if (settings.mealRateMode === 'split_fixed_equally') {
      sharedFixedPerMember = totalFixedExpenses / activeMemberCount;
    }
  } else if (totalMeals > 0) {
    if (settings.mealRateMode === 'bazar_and_fixed') {
      mealRate = totalExpenses / totalMeals;
      sharedFixedPerMember = 0;
    } else if (settings.mealRateMode === 'split_fixed_equally') {
      mealRate = totalBazarCost / totalMeals;
      sharedFixedPerMember = totalFixedExpenses / activeMemberCount;
    } else {
      // Default: 'bazar_only'
      mealRate = totalBazarCost / totalMeals;
      sharedFixedPerMember = 0;
    }
  }

  // Fallback: If mealRate is 0 and settings has a fixedMealRate, use fixedMealRate
  if (mealRate === 0 && settings.fixedMealRate && settings.fixedMealRate > 0) {
    mealRate = settings.fixedMealRate;
  }

  // 5. Member-wise calculations
  const memberCalculations: MemberMonthlyCalculation[] = relevantMembers.map((member) => {
    // Total meals for this member
    const memberMeals = monthMeals
      .filter((m) => m.memberId === member.id)
      .reduce((acc, m) => acc + (Number(m.mealCount) || 0), 0);

    const mealCost = memberMeals * mealRate;
    const totalCost = mealCost + sharedFixedPerMember;

    // Deposits paid directly
    const directDeposits = monthDeposits
      .filter((d) => d.memberId === member.id)
      .reduce((acc, d) => acc + (Number(d.amount) || 0), 0);

    // Out of pocket Bazar paid by member
    const bazarPaidOutPocket = monthBazar
      .filter((b) => b.paidByMemberId === member.id)
      .reduce((acc, b) => acc + (Number(b.amount) || 0), 0);

    // Fixed expenses paid out of pocket by member
    const fixedPaidOutPocket = monthFixed
      .filter((f) => f.paidByMemberId === member.id)
      .reduce((acc, f) => acc + (Number(f.amount) || 0), 0);

    const totalCredits = directDeposits + bazarPaidOutPocket + fixedPaidOutPocket;
    const balance = directDeposits - totalCost;

    // User logic: mealRate * meals (mealCost). If > deposit, then due = mealCost - deposit; else 0
    const memberDeposit = directDeposits;
    const due = mealCost > memberDeposit ? mealCost - memberDeposit : 0;

    let status: 'due' | 'refund' | 'settled' = 'settled';
    if (balance < -0.01) {
      status = 'due';
    } else if (balance > 0.01) {
      status = 'refund';
    }

    return {
      member,
      totalMeals: memberMeals,
      mealCost,
      sharedFixedCost: sharedFixedPerMember,
      totalCost,
      totalDeposits: directDeposits,
      bazarPaidOutPocket: bazarPaidOutPocket + fixedPaidOutPocket,
      totalCredits,
      balance,
      due,
      status,
    };
  });

  // Sort by meals descending by default
  memberCalculations.sort((a, b) => b.totalMeals - a.totalMeals);

  // 6. Statistics
  const membersWithMeals = memberCalculations.filter((m) => m.totalMeals > 0);
  const highestMealMember =
    membersWithMeals.length > 0
      ? {
          memberName: membersWithMeals[0].member.nickname || membersWithMeals[0].member.fullName,
          meals: membersWithMeals[0].totalMeals,
        }
      : undefined;

  const lowestMealMember =
    membersWithMeals.length > 0
      ? {
          memberName:
            membersWithMeals[membersWithMeals.length - 1].member.nickname ||
            membersWithMeals[membersWithMeals.length - 1].member.fullName,
          meals: membersWithMeals[membersWithMeals.length - 1].totalMeals,
        }
      : undefined;

  const avgMealsPerMember = activeMemberCount > 0 ? totalMeals / activeMemberCount : 0;

  // 7. Cash in Mess Fund
  // Deposits are cash collected by the manager
  const totalDirectDeposits = monthDeposits.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
  // Expenses paid from the mess cash fund
  const bazarPaidFromFund = monthBazar
    .filter((b) => b.paidByMemberId === 'MESS_FUND')
    .reduce((acc, b) => acc + (Number(b.amount) || 0), 0);
  const fixedPaidFromFund = monthFixed
    .filter((f) => f.paidByMemberId === 'MESS_FUND')
    .reduce((acc, f) => acc + (Number(f.amount) || 0), 0);

  const totalFundExpenses = bazarPaidFromFund + fixedPaidFromFund;
  const remainingCashFund = totalDirectDeposits - totalFundExpenses;

  const totalMemberCredits = memberCalculations.reduce((acc, m) => acc + m.totalCredits, 0);

  // Total Due calculation requested by user:
  // "total due er logic hobe total deposit - total running meal cost and jodi total deposite boro hoy tayle total due 00 dekabe ar total runing meal cost beshi hoy tayle koto beshi aita dekabe"
  const totalRunningMealCost = totalMeals * mealRate;
  const totalDue = totalRunningMealCost > totalDirectDeposits
    ? totalRunningMealCost - totalDirectDeposits
    : 0;

  return {
    month,
    totalMeals,
    totalBazarCost,
    totalFixedExpenses,
    totalExpenses,
    mealRate,
    totalDeposits: totalDirectDeposits,
    totalMemberCredits,
    remainingCashFund,
    activeMemberCount,
    memberCalculations,
    highestMealMember,
    lowestMealMember,
    avgMealsPerMember,
    totalDue,
    totalRunningMealCost,
  };
}

export function formatCurrency(amount: number, currency: string = '৳'): string {
  const rounded = Math.abs(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  if (amount < 0) {
    return `-${currency}${rounded}`;
  }
  return `${currency}${rounded}`;
}

export function formatRate(rate: number, currency: string = '৳'): string {
  return `${currency}${rate.toFixed(2)}`;
}
