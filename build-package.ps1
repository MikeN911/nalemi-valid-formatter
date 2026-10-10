param (
	[string]$Bump = "patch"
)

node "$PSScriptRoot\package-vsix.js" $Bump
