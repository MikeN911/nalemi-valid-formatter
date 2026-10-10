<?php
// Ukázkový soubor pro demonstraci pravidel Nalemi Valid Formatter

// 1. Správně naformátovaná třída dle pravidel:
// - Otevírací závorka na stejném řádku
// - 1 prázdný řádek ihned pod '{'
// - 2 prázdné řádky mezi metodami
// - If podmínka má '{' na stejném řádku
// - Odsazení tabulátory
class CorrectCarHelper {
	
	public static function getStartTimeLastIntervalOfPublic(int $clanek_ixp): ?int {
		
		if ($clanek_ixp > 0) {
			return $clanek_ixp * 60;
		} else {
			return null;
		}
	}
	
	
	public static function getOdkaz(string $nazev): string {
		
		return urlencode($nazev);
	}
}


// 2. Třída s chybami formátování (které rozšíření označí a nabídne Quick Fix):
// - Závorka třídy na novém řádku
// - Chybějící prázdný řádek pod '{'
// - Závorka metody na novém řádku
// - Pouze 1 prázdný řádek mezi metodami
// - Závorka if podmínky na novém řádku
class IncorrectCarHelper
{
	public function firstMethod()
	{
		$data = [];
		if (empty($data))
		{
			return false;
		}
	}

	public function secondMethod() {
		return true;
	}
}
