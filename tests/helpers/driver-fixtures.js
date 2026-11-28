// Retarget explicitly synthetic domain DTOs only; never simulation evidence.
export function retargetDriverDTO(A, weekend, lineup) {
  if(!weekend.config.driving)return;
  const model=A.DriverPersonalities.create(lineup,weekend.config.driving.seed);
  weekend.config.driving=structuredClone(model);
  weekend.session.config.driving=structuredClone(model);
  for(const e of weekend.session.state.entries){
    e.driver.personality.id=lineup[e.id];
    if(e.driver.telemetry?.driverId)e.driver.telemetry.driverId=lineup[e.id];
  }
}
