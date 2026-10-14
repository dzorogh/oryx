export type RequestSectionTone = "blue" | "violet" | "green" | "amber" | "slate" | "cyan" | "pink";

export type RequestSectionIcon =
  | "monitor"
  | "users"
  | "wallet"
  | "building"
  | "scale"
  | "cart"
  | "megaphone";

export type RequestType = {
  id: string;
  name: string;
  description: string;
};

export type RequestSubsection = {
  id: string;
  name: string;
  team: string;
  sla: string;
  types: RequestType[];
};

export type RequestSection = {
  id: string;
  name: string;
  icon: RequestSectionIcon;
  tone: RequestSectionTone;
  subsections: RequestSubsection[];
};

export type RequestTypeLocation = {
  section: RequestSection;
  subsection: RequestSubsection;
  type: RequestType;
};

type TypeRow = [id: string, name: string, description: string];

const sub = (id: string, name: string, team: string, sla: string, types: TypeRow[]): RequestSubsection => ({
  id,
  name,
  team,
  sla,
  types: types.map(([typeId, typeName, description]) => ({ id: typeId, name: typeName, description })),
});

export const REQUEST_CATALOG: RequestSection[] = [
  {
    id: "it",
    name: "IT",
    icon: "monitor",
    tone: "blue",
    subsections: [
      sub("portal", "Корпортал", "Команда корпортала", "3 рабочих дня", [
        ["portal-feature", "Новый функционал", "Предложить доработку или новый раздел портала"],
        ["portal-bug", "Баг", "Что-то работает не так, как должно"],
        ["portal-access", "Права и доступы", "Роль редактора, модератора, доступ к разделу"],
        ["portal-content", "Изменение контента", "Поправить текст, баннер или страницу"],
      ]),
      sub("bi", "BI-аналитика", "Отдел аналитики", "5 рабочих дней", [
        ["bi-report", "Новый отчёт или дашборд", "Собрать новый отчёт по вашим данным"],
        ["bi-change", "Доработка отчёта", "Добавить метрику, фильтр или разрез"],
        ["bi-access", "Доступ к дашборду", "Открыть просмотр существующего дашборда"],
        ["bi-data", "Ошибка в данных", "Цифры в отчёте не сходятся"],
      ]),
      sub("support", "Техподдержка", "Служба поддержки", "4 часа", [
        ["sup-pc", "Не работает компьютер", "Не включается, тормозит, синий экран"],
        ["sup-soft", "Установка ПО", "Поставить программу из каталога"],
        ["sup-mail", "Почта и календарь", "Не приходят письма, проблемы с Outlook"],
        ["sup-print", "Принтер и МФУ", "Не печатает, замятие, картридж"],
      ]),
      sub("hardware", "Оборудование", "Служба поддержки", "2 рабочих дня", [
        ["hw-laptop", "Ноутбук или ПК", "Выдать или заменить рабочий компьютер"],
        ["hw-periph", "Монитор и периферия", "Монитор, клавиатура, гарнитура, док-станция"],
        ["hw-phone", "Мобильный телефон", "Корпоративный телефон или SIM-карта"],
        ["hw-return", "Возврат оборудования", "Сдать технику при увольнении или замене"],
      ]),
      sub("erp", "1С и ERP", "Команда 1С", "3 рабочих дня", [
        ["erp-bug", "Ошибка в 1С", "Не проводится документ, ошибка при открытии"],
        ["erp-new", "Новая обработка или отчёт", "Автоматизировать рутинную операцию"],
        ["erp-access", "Доступ к базе", "Права на базу или конкретные документы"],
      ]),
      sub("security", "Информационная безопасность", "Отдел ИБ", "1 рабочий день", [
        ["sec-vpn", "VPN-доступ", "Удалённая работа из дома или поездки"],
        ["sec-incident", "Сообщить об инциденте", "Подозрительное письмо, утечка, взлом"],
        ["sec-usb", "Доступ к USB-накопителям", "Временное разрешение на флешки"],
        ["sec-unlock", "Разблокировка учётной записи", "Забыли пароль или учётка заблокирована"],
      ]),
    ],
  },
  {
    id: "hr",
    name: "HR",
    icon: "users",
    tone: "violet",
    subsections: [
      sub("docs", "Кадровые документы", "Отдел кадров", "2 рабочих дня", [
        ["hr-cert", "Справка с места работы", "Для банка, визы, детского сада"],
        ["hr-2ndfl", "Справка 2-НДФЛ", "Справка о доходах за период"],
        ["hr-copy", "Копия трудовой книжки", "Заверенная копия или выписка СТД-Р"],
        ["hr-pdata", "Изменение персональных данных", "Фамилия, паспорт, реквизиты для зарплаты"],
      ]),
      sub("leave", "Отпуска и отсутствия", "Отдел кадров", "1 рабочий день", [
        ["vacation", "Ежегодный отпуск", "Оплачиваемый отпуск по графику или вне его"],
        ["leave-unpaid", "Отпуск за свой счёт", "Дни без сохранения зарплаты"],
        ["leave-sick", "Больничный", "Сообщить номер электронного больничного"],
        ["leave-move", "Перенос отпуска", "Сдвинуть даты из графика отпусков"],
      ]),
      sub("learning", "Обучение", "Команда развития", "5 рабочих дней", [
        ["learn-course", "Внешний курс", "Оплата курса, тренинга или сертификации"],
        ["learn-conf", "Конференция", "Участие или выступление на конференции"],
        ["learn-inner", "Внутренний тренинг", "Заказать тренинг для своей команды"],
      ]),
      sub("hiring", "Подбор персонала", "Рекрутинг", "3 рабочих дня", [
        ["hire-vacancy", "Открыть вакансию", "Новая позиция или замена сотрудника"],
        ["hire-referral", "Рекомендовать кандидата", "Реферальная программа"],
      ]),
      sub("onboarding", "Онбординг и оффбординг", "HR-партнёры", "5 рабочих дней", [
        ["onb-new", "Выход нового сотрудника", "Рабочее место, техника, доступы — одним пакетом"],
        ["onb-leave", "Увольнение сотрудника", "Обходной лист и отключение доступов"],
        ["onb-transfer", "Перевод в другой отдел", "Смена должности, руководителя, доступов"],
      ]),
    ],
  },
  {
    id: "finance",
    name: "Финансы",
    icon: "wallet",
    tone: "green",
    subsections: [
      sub("treasury", "Казначейство", "Казначейство", "2 рабочих дня", [
        ["pay-invoice", "Оплата счёта", "Оплатить счёт поставщика"],
        ["pay-urgent", "Срочный платёж", "Оплата сегодня, с обоснованием срочности"],
        ["pay-refund", "Возврат средств контрагенту", "Вернуть переплату или аванс"],
      ]),
      sub("accounting", "Бухгалтерия", "Бухгалтерия", "3 рабочих дня", [
        ["acc-recon", "Акт сверки", "Сверка взаиморасчётов с контрагентом"],
        ["acc-closing", "Закрывающие документы", "Запросить акты, УПД, счета-фактуры"],
        ["acc-salary", "Вопрос по зарплате", "Расчётный лист, удержания, премия"],
      ]),
      sub("budget", "Бюджетирование", "Финансовый контроль", "5 рабочих дней", [
        ["bud-move", "Перенос бюджета", "Перераспределить между статьями или месяцами"],
        ["bud-new", "Новая статья бюджета", "Внеплановый расход"],
      ]),
      sub("trips", "Командировки", "Travel-менеджер", "2 рабочих дня", [
        ["trip", "Командировка", "Билеты, гостиница и суточные"],
        ["trip-report", "Авансовый отчёт", "Отчитаться о потраченных средствах"],
        ["trip-card", "Корпоративная карта", "Выпуск или изменение лимита"],
      ]),
    ],
  },
  {
    id: "office",
    name: "АХО",
    icon: "building",
    tone: "amber",
    subsections: [
      sub("facilities", "Офис", "Административная служба", "1 рабочий день", [
        ["off-repair", "Ремонт или неисправность", "Свет, кондиционер, сантехника, двери"],
        ["off-clean", "Уборка", "Внеплановая уборка помещения"],
        ["off-place", "Рабочее место и мебель", "Стол, кресло, переезд на другое место"],
      ]),
      sub("passes", "Пропуска", "Служба охраны", "4 часа", [
        ["guest-pass", "Гостевой пропуск", "Пропустить гостя в офис"],
        ["car-pass", "Пропуск на автомобиль", "Въезд на парковку"],
        ["pass-restore", "Восстановить пропуск", "Потерян или сломан"],
      ]),
      sub("rooms", "Переговорные и мероприятия", "Административная служба", "2 рабочих дня", [
        ["room-book", "Бронь большого зала", "Конференц-зал на 40+ человек"],
        ["room-coffee", "Кофе-брейк", "Кофе, вода, перекус для встречи"],
        ["room-event", "Организация мероприятия", "Корпоратив, тимбилдинг, день рождения"],
      ]),
      sub("courier", "Канцелярия и курьер", "Административная служба", "1 рабочий день", [
        ["cur-stationery", "Канцелярия", "Бумага, ручки, блокноты"],
        ["cur-delivery", "Курьерская доставка", "Отвезти документы по городу"],
        ["cur-cards", "Визитки", "Заказать визитные карточки"],
      ]),
    ],
  },
  {
    id: "legal",
    name: "Юридический отдел",
    icon: "scale",
    tone: "slate",
    subsections: [
      sub("contracts", "Договоры", "Юристы", "3 рабочих дня", [
        ["contract-approve", "Согласовать договор", "Проверка договора от контрагента"],
        ["contract-template", "Договор по шаблону", "Подготовить договор по типовой форме"],
        ["contract-addendum", "Дополнительное соглашение", "Изменить условия действующего договора"],
      ]),
      sub("poa", "Доверенности", "Юристы", "2 рабочих дня", [
        ["poa-issue", "Выпуск доверенности", "Представлять компанию, подписывать документы"],
        ["poa-revoke", "Отзыв доверенности", "Досрочно прекратить действие"],
      ]),
      sub("consult", "Консультации", "Юристы", "3 рабочих дня", [
        ["legal-q", "Правовая консультация", "Вопрос по закону или договору"],
        ["legal-claim", "Претензия или иск", "Пришла претензия или нужно её направить"],
      ]),
    ],
  },
  {
    id: "procurement",
    name: "Закупки",
    icon: "cart",
    tone: "cyan",
    subsections: [
      sub("goods", "Товары", "Отдел закупок", "5 рабочих дней", [
        ["buy-goods", "Закупка товаров", "Материалы, оборудование, расходники"],
        ["buy-repeat", "Повторная закупка", "Повторить одну из прошлых закупок"],
      ]),
      sub("services", "Услуги и подписки", "Отдел закупок", "5 рабочих дней", [
        ["buy-service", "Закупка услуг", "Подрядчик, консалтинг, аутсорс"],
        ["buy-saas", "Подписка на ПО или SaaS", "Лицензии, облачные сервисы"],
      ]),
      sub("vendors", "Поставщики", "Отдел закупок", "3 рабочих дня", [
        ["vendor-new", "Новый поставщик", "Завести контрагента в систему"],
        ["vendor-check", "Проверка контрагента", "Надёжность, суды, финансовое состояние"],
      ]),
    ],
  },
  {
    id: "marketing",
    name: "Маркетинг",
    icon: "megaphone",
    tone: "pink",
    subsections: [
      sub("design", "Дизайн", "Студия дизайна", "5 рабочих дней", [
        ["des-banner", "Баннер или макет", "Для портала, соцсетей, наружки"],
        ["des-deck", "Презентация", "Оформить презентацию в фирменном стиле"],
        ["des-video", "Видео", "Ролик, анимация, монтаж"],
      ]),
      sub("merch", "Мерч и полиграфия", "Бренд-менеджер", "10 рабочих дней", [
        ["merch", "Мерч", "Футболки, худи, кружки к событию"],
        ["print", "Полиграфия", "Листовки, буклеты, плакаты"],
      ]),
      sub("comms", "Коммуникации", "Внутренние коммуникации", "2 рабочих дня", [
        ["comm-post", "Публикация на портале", "Новость или анонс в ленте"],
        ["comm-mail", "Рассылка", "Письмо всем сотрудникам или отделу"],
        ["comm-press", "Пресс-релиз", "Внешняя публикация о компании"],
      ]),
    ],
  },
];

export const findRequestType = (typeId: string): RequestTypeLocation | null => {
  for (const section of REQUEST_CATALOG) {
    for (const subsection of section.subsections) {
      const type = subsection.types.find((item) => item.id === typeId);
      if (type) return { section, subsection, type };
    }
  }
  return null;
};

export type CatalogSelection = {
  section: RequestSection;
  subsection: RequestSubsection;
};

/** Falls back to the first section / its first subsection for unknown ids. */
export const resolveCatalogSelection = (
  sectionId: string | null | undefined,
  subsectionId: string | null | undefined,
): CatalogSelection => {
  const section = REQUEST_CATALOG.find((item) => item.id === sectionId) ?? REQUEST_CATALOG[0];
  const subsection =
    section.subsections.find((item) => item.id === subsectionId) ?? section.subsections[0];
  return { section, subsection };
};

const normalize = (value: string) => value.toLocaleLowerCase("ru").replaceAll("ё", "е").trim();

/** Matches every word of the query against type name, description, subsection and section names. */
export const searchRequestTypes = (query: string): RequestTypeLocation[] => {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const results: RequestTypeLocation[] = [];
  for (const section of REQUEST_CATALOG) {
    for (const subsection of section.subsections) {
      for (const type of subsection.types) {
        const haystack = normalize(
          `${type.name} ${type.description} ${subsection.name} ${section.name}`,
        );
        if (words.every((word) => haystack.includes(word))) {
          results.push({ section, subsection, type });
        }
      }
    }
  }
  return results;
};
