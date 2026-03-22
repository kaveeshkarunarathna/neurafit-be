import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const user = await prisma.user.findUnique({ where: { email: 'john@gmail.com' } });
  if (!user) return console.log('User not found');
  
  const activePlan = await prisma.workoutPlan.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
  });
  console.log("ACTIVE PLAN GOAL:", activePlan?.goal);
  if (activePlan) {
      const totalPlanDays = (activePlan.workouts as any[]).reduce((total: number, w: any) => total + (w.days?.length || 0), 0);
      console.log("TOTAL PLAN DAYS:", totalPlanDays);
  }
  
  const sessions = await prisma.workoutSession.findMany({ where: { userId: user.id }, orderBy: { date: 'desc' }});
  console.log("SESSIONS DATES:", sessions.map(s => s.date.toISOString().split('T')[0]));
  console.log("SESSIONS EXACT:", sessions.map(s => s.date));
}
run().catch(console.error).finally(() => prisma.$disconnect());
