export default function BookingSteps({ currentStep, totalSteps = 4 }) {
  const steps = ['Details', 'Verification', 'Payment', 'Confirm']
  const fillWidth = `${((currentStep - 1) / (totalSteps - 1)) * 100}%`

  return (
    <div className="relative mb-12">
      {/* Line */}
      <div className="progress-line" />
      <div className="progress-fill" style={{ width: fillWidth }} />
      {/* Steps */}
      <div className="relative z-10 flex justify-between">
        {steps.map((label, i) => {
          const stepNum = i + 1
          const isActive = stepNum <= currentStep
          return (
            <div key={label} className="flex flex-col items-center gap-2">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  isActive
                    ? stepNum === currentStep
                      ? 'step-active border-4 border-primary-fixed'
                      : 'step-active'
                    : 'step-inactive'
                }`}
              >
                {stepNum < currentStep ? (
                  <span className="material-symbols-outlined text-[18px]">check</span>
                ) : stepNum}
              </div>
              <span className={`text-label-md font-bold ${isActive ? 'text-primary' : 'text-secondary'}`}>
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
