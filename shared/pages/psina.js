/** @decorator */

const { BasePage } = await import(`${globalThis.ppp.rootUrl}/shared/page.js`);
const { observable, Observable } = await import(
  `${globalThis.ppp.rootUrl}/shared/element/observation/observable.js`
);
const { validate, ValidationError } = await import(
  `${globalThis.ppp.rootUrl}/shared/validate.js`
);
const { maybeFetchError } = await import(
  `${globalThis.ppp.rootUrl}/shared/fetch-error.js`
);

const { generateIV, bufferToString, uuidv4, sha256 } = await import(
  `${globalThis.ppp.rootUrl}/shared/ppp-crypto.js`
);
const { SUPPORTED_BROKERS, SUPPORTED_APIS } = await import(
  `${globalThis.ppp.rootUrl}/shared/const.js`
);
const { Tmpl } = await import(`${globalThis.ppp.rootUrl}/shared/tmpl.js`);

async function blobToBase64(blob) {
  return new Promise((resolve, _) => {
    const reader = new FileReader();

    reader.onloadend = () =>
      resolve(reader.result.replace('data:application/zip;base64,', ''));
    reader.readAsDataURL(blob);
  });
}

export class PsinaPage extends BasePage {
  @observable
  activeTab;

  @observable
  pusherApis;

  @observable
  alorBrokerProfiles;

  @observable
  psinaKeys;

  @observable
  psinaStats;

  achievementsTableRows = [];

  achievementsTableColumns = [
    {
      label: 'Название'
    },
    {
      label: 'Описание'
    },
    {
      label: 'Дата получения'
    }
  ];

  paymentsTableRows = [];

  paymentsTableColumns = [
    {
      label: 'Тип'
    },
    {
      label: 'Сумма'
    },
    {
      label: 'Дата'
    }
  ];

  async activeTabChanged(oldValue, newValue) {
    this.tabs.activeid = newValue;

    if (this.activeTab === 'keys') void this.renderKeysTab();
  }

  handlePsinaTabChange() {
    this.activeTab = this.tabs.activetab.id;
  }

  async connectToPusher({ key, cluster }) {
    await import(
      `${globalThis.ppp.rootUrl}/vendor/pusher-with-encryption.min.js`
    );

    if (!this.pusherConnection) {
      this.pusherConnection = new globalThis.Pusher(key, {
        cluster
      });

      this.pusherConnection.subscribe('psina').bind('message', (data) => {
        // TODO
        console.log(data);
      });
    }
  }

  async connectedCallback() {
    super.connectedCallback();

    this.beginOperation();

    try {
      this.pusherApis = null;
      this.alorBrokerProfiles = null;
      this.activeTab = 'overview';

      await this.fetchPsinaKeys();

      if (this.psinaKeys?.pusherApi) {
        await this.connectToPusher({
          key: this.psinaKeys.pusherApi.key,
          cluster: this.psinaKeys.pusherApi.cluster
        });
      }
    } catch (e) {
      this.failOperation(e);
      await this.notFound();
    } finally {
      this.endOperation();
    }
  }

  async disconnectedCallback() {
    super.disconnectedCallback();

    if (this.pusherConnection) {
      this.pusherConnection.unsubscribe('psina');
    }
  }

  async fetchPsinaKeys() {
    [this.psinaKeys] = await this.app.ppp.user.functions.aggregate(
      {
        collection: 'psina'
      },
      [
        {
          $match: {
            name: 'keys'
          }
        },
        {
          $lookup: {
            from: 'apis',
            localField: 'pusherApiId',
            foreignField: '_id',
            as: 'pusherApi'
          }
        }
      ]
    );

    if (this.psinaKeys) {
      this.psinaKeys.ycPrivateKey = await this.app.ppp.crypto.decrypt(
        this.psinaKeys.iv,
        this.psinaKeys.ycPrivateKey
      );

      if (Array.isArray(this.psinaKeys.pusherApi))
        this.psinaKeys.pusherApi = this.psinaKeys.pusherApi[0];
    }

    Observable.notify(this, 'psinaKeys');
  }

  async renderKeysTab() {
    this.beginOperation();

    try {
      [this.pusherApis, this.alorBrokerProfiles] = await Promise.all([
        this.app.ppp.user.functions.aggregate(
          {
            collection: 'apis'
          },
          [
            {
              $match: {
                $and: [
                  {
                    type: SUPPORTED_APIS.PUSHER
                  },
                  {
                    $or: [
                      { removed: { $not: { $eq: true } } },
                      { _id: this.psinaKeys?.pusherApiId }
                    ]
                  }
                ]
              }
            }
          ]
        ),
        this.app.ppp.user.functions.aggregate(
          {
            collection: 'brokers'
          },
          [
            {
              $match: {
                $and: [
                  {
                    type: SUPPORTED_BROKERS.ALOR_OPENAPI_V2
                  },
                  {
                    $or: [
                      { removed: { $not: { $eq: true } } },
                      { _id: this.psinaKeys?.alorBrokerId }
                    ]
                  }
                ]
              }
            }
          ]
        )
      ]);

      if (!this.pusherApis.length) this.pusherApis = void 0;

      if (!this.alorBrokerProfiles.length) this.alorBrokerProfiles = void 0;
    } catch (e) {
      this.failOperation(e);
      await this.notFound();
    } finally {
      this.endOperation();
    }
  }

  async #setupYCPPPFunction({
    name,
    iamToken,
    alorRefreshToken,
    functionId,
    folderId,
    serviceAccountId,
    functionSource
  }) {
    if (!functionId) {
      const newFunction = await (
        await fetch(
          new URL(
            'fetch',
            this.app.ppp.keyVault.getKey('service-machine-url')
          ).toString(),
          {
            cache: 'no-cache',
            method: 'POST',
            body: JSON.stringify({
              method: 'POST',
              url: 'https://serverless-functions.api.cloud.yandex.net/functions/v1/functions',
              headers: {
                Authorization: `Bearer ${iamToken}`
              },
              body: JSON.stringify({
                folderId,
                name
              })
            })
          }
        )
      ).json();

      functionId = newFunction.metadata.functionId;
    }

    const setPublicFunctionRequest = await fetch(
      new URL(
        'fetch',
        this.app.ppp.keyVault.getKey('service-machine-url')
      ).toString(),
      {
        cache: 'no-cache',
        method: 'POST',
        body: JSON.stringify({
          method: 'POST',
          url: `https://serverless-functions.api.cloud.yandex.net/functions/v1/functions/${functionId}:setAccessBindings`,
          headers: {
            Authorization: `Bearer ${iamToken}`
          },
          body: JSON.stringify({
            accessBindings: [
              {
                roleId: 'serverless.functions.invoker',
                subject: {
                  id: 'allUsers',
                  type: 'system'
                }
              }
            ]
          })
        })
      }
    );

    await maybeFetchError(
      setPublicFunctionRequest,
      `Не удалось включить публичный режим для функции ${name} Yandex Cloud.`
    );
    await import(`${globalThis.ppp.rootUrl}/vendor/zip-full.min.js`);

    globalThis.zip.configure({
      useWebWorkers: true
    });

    const blobWriter = new globalThis.zip.BlobWriter('application/zip');
    const writer = new globalThis.zip.ZipWriter(blobWriter);

    await writer.add(
      'psina.js',
      new globalThis.zip.TextReader(
        await new Tmpl().render(this, functionSource, {})
      )
    );
    await writer.close();

    const createVersionRequest = await fetch(
      new URL(
        'fetch',
        this.app.ppp.keyVault.getKey('service-machine-url')
      ).toString(),
      {
        cache: 'no-cache',
        method: 'POST',
        body: JSON.stringify({
          method: 'POST',
          url: 'https://serverless-functions.api.cloud.yandex.net/functions/v1/versions',
          headers: {
            Authorization: `Bearer ${iamToken}`
          },
          body: JSON.stringify({
            functionId,
            entrypoint: 'psina.teeth',
            environment: {
              ALOR_TOKEN: alorRefreshToken,
              ALOR_PORTFOLIO: this.alorPortfolio.value.trim()
            },
            executionTimeout: '5s',
            runtime: 'nodejs16',
            resources: {
              memory: '134217728'
            },
            serviceAccountId,
            content: await blobToBase64(blobWriter.getData())
          })
        })
      }
    );

    await maybeFetchError(
      createVersionRequest,
      `Не удалось создать версию облачной функции ${name} Yandex Cloud.`
    );

    return functionId;
  }

  async #setupYCServerlessFunctions({
    iamToken,
    serviceAccountId,
    alorRefreshToken
  }) {
    const { clouds } = await (
      await fetch(
        new URL(
          'fetch',
          this.app.ppp.keyVault.getKey('service-machine-url')
        ).toString(),
        {
          cache: 'no-cache',
          method: 'POST',
          body: JSON.stringify({
            method: 'GET',
            url: 'https://resource-manager.api.cloud.yandex.net/resource-manager/v1/clouds',
            headers: {
              Authorization: `Bearer ${iamToken}`
            }
          })
        }
      )
    ).json();

    const pppCloud = clouds?.find((c) => c.name === 'ppp');

    // {id: '', createdAt: '2022-04-20T12:49:55Z', name: 'ppp', organizationId: ''}
    if (!pppCloud) {
      // noinspection ExceptionCaughtLocallyJS
      throw new ValidationError({
        element: this.app.toast,
        status: 404,
        message: 'Облако под названием ppp не найдено в Yandex Cloud.'
      });
    }

    const { folders } = await (
      await fetch(
        new URL(
          'fetch',
          this.app.ppp.keyVault.getKey('service-machine-url')
        ).toString(),
        {
          cache: 'no-cache',
          method: 'POST',
          body: JSON.stringify({
            method: 'GET',
            url: `https://resource-manager.api.cloud.yandex.net/resource-manager/v1/folders?cloudId=${pppCloud.id}`,
            headers: {
              Authorization: `Bearer ${iamToken}`
            }
          })
        }
      )
    ).json();

    const psinaFolder = folders?.find(
      (f) => f.name === 'psina' && f.status === 'ACTIVE'
    );

    // {id: '', cloudId: '', createdAt: '2022-04-20T12:49:55Z', name: 'psina', status: 'ACTIVE'}
    if (!psinaFolder) {
      // noinspection ExceptionCaughtLocallyJS
      throw new ValidationError({
        element: this.app.toast,
        status: 404,
        message:
          'Каталог psina не найден либо неактивен в облаке ppp Yandex Cloud.'
      });
    }

    const ycFuncList = await (
      await fetch(
        new URL(
          'fetch',
          this.app.ppp.keyVault.getKey('service-machine-url')
        ).toString(),
        {
          cache: 'no-cache',
          method: 'POST',
          body: JSON.stringify({
            method: 'GET',
            url: `https://serverless-functions.api.cloud.yandex.net/functions/v1/functions?folderId=${psinaFolder.id}`,
            headers: {
              Authorization: `Bearer ${iamToken}`
            }
          })
        }
      )
    ).json();

    if (ycFuncList?.code === 7) {
      // noinspection ExceptionCaughtLocallyJS
      throw new ValidationError({
        element: this.app.toast,
        status: 403,
        message:
          'Сервисный аккаунт не имеет прав для работы с облачными функциями Yandex Cloud.'
      });
    }

    const { origin } = new URL(import.meta.url);

    const alpharaId = await this.#setupYCPPPFunction({
      name: 'ppp-alphara',
      iamToken,
      alorRefreshToken,
      serviceAccountId,
      folderId: psinaFolder.id,
      functionId: ycFuncList?.functions?.find((i) => i.name === 'ppp-alphara')
        ?.id,
      functionSource: await (
        await fetch(new URL('psina/shared/ppp-alphara.js', origin).toString())
      ).text()
    });

    const betaraId = await this.#setupYCPPPFunction({
      name: 'ppp-betara',
      iamToken,
      alorRefreshToken,
      serviceAccountId,
      folderId: psinaFolder.id,
      functionId: ycFuncList?.functions?.find((i) => i.name === 'ppp-betara')
        ?.id,
      functionSource: await (
        await fetch(new URL('psina/shared/ppp-alphara.js', origin).toString())
      ).text()
    });

    const gammaraId = await this.#setupYCPPPFunction({
      name: 'ppp-gammara',
      iamToken,
      alorRefreshToken,
      serviceAccountId,
      folderId: psinaFolder.id,
      functionId: ycFuncList?.functions?.find((i) => i.name === 'ppp-gammara')
        ?.id,
      functionSource: await (
        await fetch(new URL('psina/shared/ppp-alphara.js', origin).toString())
      ).text()
    });

    return { alpharaId, betaraId, gammaraId };
  }

  async #checkAlorPortfolio() {
    const alorBroker = this.alorBrokerProfiles.find(
      (p) => p._id === this.alorBroker.value
    );

    const refreshToken = await this.app.ppp.crypto.decrypt(
      alorBroker.iv,
      alorBroker.refreshToken
    );

    const jwtRequest = await fetch(
      `https://oauth.alor.ru/refresh?token=${refreshToken}`,
      {
        method: 'POST'
      }
    );

    await maybeFetchError(jwtRequest, 'Неверный токен Alor.');

    const { AccessToken } = await jwtRequest.json();
    const positionsRequest = await fetch(
      `https://api.alor.ru/md/v2/Clients/SPBX/${this.alorPortfolio.value.trim()}/positions`,
      {
        headers: {
          'X-ALOR-REQID': uuidv4(),
          Authorization: `Bearer ${AccessToken}`
        }
      }
    );

    await maybeFetchError(
      positionsRequest,
      'Не удаётся получить позиции. Убедитесь, что портфель верный.'
    );

    const positions = (await positionsRequest.json())?.filter((p) => p.qty > 0);

    if (positions.length > 1) {
      throw new ValidationError({
        element: this.app.toast,
        status: 404,
        message: 'В портфеле не должно быть открытых позиций по ценным бумагам.'
      });
    }

    if (positions.length === 0) {
      throw new ValidationError({
        element: this.app.toast,
        status: 404,
        message: 'Свободный баланс портфеля должен составлять не менее $1000.'
      });
    }

    if (positions[0].symbol === 'USD' && positions[0].qty >= 1000) {
      return refreshToken;
    }

    throw new ValidationError({
      element: this.app.toast,
      status: 404,
      message: 'Свободный баланс портфеля должен составлять не менее $1000.'
    });
  }

  async #createOrUpdateMongoDBRealmPsinaEndpoint({
    groupId,
    appId,
    functionList,
    functionName,
    endpointName,
    source,
    mongoDBRealmAccessToken
  }) {
    const existingFunc = functionList?.find((f) => f.name === functionName);
    let functionId;

    if (existingFunc) {
      functionId = existingFunc._id;

      const rUpdateFunc = await fetch(
        new URL(
          'fetch',
          this.app.ppp.keyVault.getKey('service-machine-url')
        ).toString(),
        {
          cache: 'no-cache',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            method: 'PUT',
            url: `https://realm.mongodb.com/api/admin/v3.0/groups/${groupId}/apps/${appId}/functions/${existingFunc._id}`,
            headers: {
              Authorization: `Bearer ${mongoDBRealmAccessToken}`
            },
            body: JSON.stringify({
              name: functionName,
              source,
              run_as_system: true
            })
          })
        }
      );

      await maybeFetchError(
        rUpdateFunc,
        `Не удалось обновить функцию ${functionName}.`
      );
    } else {
      const rCreateFunc = await fetch(
        new URL(
          'fetch',
          this.app.ppp.keyVault.getKey('service-machine-url')
        ).toString(),
        {
          cache: 'no-cache',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            method: 'POST',
            url: `https://realm.mongodb.com/api/admin/v3.0/groups/${groupId}/apps/${appId}/functions`,
            headers: {
              Authorization: `Bearer ${mongoDBRealmAccessToken}`
            },
            body: JSON.stringify({
              name: functionName,
              source,
              run_as_system: true
            })
          })
        }
      );

      await maybeFetchError(
        rCreateFunc,
        `Не удалось создать функцию ${functionName}.`
      );

      const jCreateFunc = await rCreateFunc.json();

      functionId = jCreateFunc._id;
    }

    const rNewEndpoint = await fetch(
      new URL(
        'fetch',
        this.app.ppp.keyVault.getKey('service-machine-url')
      ).toString(),
      {
        cache: 'no-cache',
        method: 'POST',
        body: JSON.stringify({
          method: 'POST',
          url: `https://realm.mongodb.com/api/admin/v3.0/groups/${groupId}/apps/${appId}/endpoints`,
          body: {
            route: endpointName,
            function_name: functionName,
            function_id: functionId,
            http_method: 'POST',
            validation_method: 'NO_VALIDATION',
            secret_id: '',
            secret_name: '',
            create_user_on_auth: false,
            fetch_custom_user_data: false,
            respond_result: true,
            disabled: false
          },
          headers: {
            Authorization: `Bearer ${mongoDBRealmAccessToken}`
          }
        })
      }
    );

    // Conflict is OK
    if (rNewEndpoint.status !== 409)
      await maybeFetchError(
        rNewEndpoint,
        `Не удалось создать конечную точку для функции ${functionName}.`
      );
  }

  async #setupMongoDBRealmPsinaEndpoints({
    serviceAccountId,
    alpharaId,
    betaraId,
    gammaraId
  }) {
    const groupId = this.app.ppp.keyVault.getKey('mongo-group-id');
    const appId = this.app.ppp.keyVault.getKey('mongo-app-id');

    const rMongoDBRealmCredentials = await fetch(
      new URL(
        'fetch',
        this.app.ppp.keyVault.getKey('service-machine-url')
      ).toString(),
      {
        cache: 'no-cache',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: 'https://realm.mongodb.com/api/admin/v3.0/auth/providers/mongodb-cloud/login',
          body: {
            username: this.app.ppp.keyVault.getKey('mongo-public-key'),
            apiKey: this.app.ppp.keyVault.getKey('mongo-private-key')
          }
        })
      }
    );

    await maybeFetchError(
      rMongoDBRealmCredentials,
      'Не удалось авторизоваться в MongoDB Realm.'
    );

    const jMongoDBRealmCredentials = await rMongoDBRealmCredentials.json();
    const mongoDBRealmAccessToken = jMongoDBRealmCredentials.access_token;

    const rFunctionList = await fetch(
      new URL(
        'fetch',
        this.app.ppp.keyVault.getKey('service-machine-url')
      ).toString(),
      {
        cache: 'no-cache',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          method: 'GET',
          url: `https://realm.mongodb.com/api/admin/v3.0/groups/${groupId}/apps/${appId}/functions`,
          headers: {
            Authorization: `Bearer ${mongoDBRealmAccessToken}`
          }
        })
      }
    );

    await maybeFetchError(
      rFunctionList,
      'Не удалось получить список облачных функций MongoDB Realm.'
    );

    const functionList = await rFunctionList.json();
    const { origin } = new URL(import.meta.url);
    const endpointSuffix = await sha256(serviceAccountId);

    const pusherApi = this.pusherApis.find(
      (a) => a._id === this.pusherApi.value
    );

    const pusherSecret = await this.app.ppp.crypto.decrypt(
      pusherApi.iv,
      pusherApi.secret
    );

    await this.#createOrUpdateMongoDBRealmPsinaEndpoint({
      groupId,
      appId,
      functionList,
      functionName: 'psinaPusher',
      endpointName: `/psina_pusher_${endpointSuffix}`,
      source: await new Tmpl().render(
        this,
        await (
          await fetch(
            new URL('psina/shared/psina-pusher.js', origin).toString()
          )
        ).text(),
        {
          appid: pusherApi.appid,
          key: pusherApi.key,
          secret: pusherSecret,
          cluster: pusherApi.cluster
        }
      ),
      mongoDBRealmAccessToken
    });

    await this.#createOrUpdateMongoDBRealmPsinaEndpoint({
      groupId,
      appId,
      functionList,
      functionName: 'psinaWarden',
      endpointName: `/psina_warden_${endpointSuffix}`,
      source: await new Tmpl().render(
        this,
        await (
          await fetch(
            new URL('psina/shared/psina-warden.js', origin).toString()
          )
        ).text(),
        {
          mongoLocationUrl: this.app.ppp.keyVault.getKey('mongo-location-url'),
          mongoAppId: this.app.ppp.keyVault.getKey('mongo-app-client-id'),
          endpointSuffix,
          alpharaId,
          betaraId,
          gammaraId
        }
      ),
      mongoDBRealmAccessToken
    });

    await this.#createOrUpdateMongoDBRealmPsinaEndpoint({
      groupId,
      appId,
      functionList,
      functionName: 'psinaRealm',
      endpointName: `/psina_realm_${endpointSuffix}`,
      source: await new Tmpl().render(
        this,
        await (
          await fetch(new URL('psina/shared/psina-realm.js', origin).toString())
        ).text(),
        {}
      ),
      mongoDBRealmAccessToken
    });

    return { endpointSuffix };
  }

  async savePsinaKeys() {
    this.beginOperation();

    try {
      await validate(this.ycServiceAccountId);
      await validate(this.ycPublicKeyId);
      await validate(this.ycPrivateKey);
      await validate(this.alorBroker);
      await validate(this.alorPortfolio);
      await validate(this.pusherApi);

      this.progressOperation(0, 'Проверка портфеля Алор');

      const alorRefreshToken = await this.#checkAlorPortfolio();

      this.progressOperation(10, 'Формирование IAM-токена Yandex Cloud');

      const jose = await import(`${globalThis.ppp.rootUrl}/vendor/jose.min.js`);
      const now = Math.floor(new Date().getTime() / 1000);
      const payload = {
        aud: 'https://iam.api.cloud.yandex.net/iam/v1/tokens',
        iss: this.ycServiceAccountId.value.trim(),
        iat: now,
        exp: now + 300
      };

      const privateKey = this.ycPrivateKey.value.trim();
      const key = await jose.importPKCS8(privateKey, 'PS256');
      const jwt = await new jose.CompactSign(
        new TextEncoder().encode(JSON.stringify(payload))
      )
        .setProtectedHeader({
          alg: 'PS256',
          kid: this.ycPublicKeyId.value.trim()
        })
        .sign(key);

      const iamTokenRequest = await fetch(
        new URL(
          'fetch',
          this.app.ppp.keyVault.getKey('service-machine-url')
        ).toString(),
        {
          cache: 'no-cache',
          method: 'POST',
          body: JSON.stringify({
            method: 'POST',
            url: 'https://iam.api.cloud.yandex.net/iam/v1/tokens',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ jwt })
          })
        }
      );

      await maybeFetchError(
        iamTokenRequest,
        'Не удаётся получить IAM-токен. Проверьте правильность ключей Yandex Cloud.'
      );

      const { iamToken } = await iamTokenRequest.json();

      this.progressOperation(20, 'Запись функций в облако Yandex Cloud');

      const { alpharaId, betaraId, gammaraId } =
        await this.#setupYCServerlessFunctions({
          iamToken,
          alorRefreshToken,
          serviceAccountId: this.ycServiceAccountId.value.trim()
        });

      this.progressOperation(
        50,
        'Запись конечных точек в облако MongoDB Realm'
      );

      const { endpointSuffix } = await this.#setupMongoDBRealmPsinaEndpoints({
        serviceAccountId: this.ycServiceAccountId.value.trim(),
        alpharaId,
        betaraId,
        gammaraId
      });

      this.progressOperation(90, 'Запись ключей в MongoDB');

      const iv = generateIV();
      const encryptedPrivateKey = await this.app.ppp.crypto.encrypt(
        iv,
        this.ycPrivateKey.value.trim()
      );

      const psinaKeys = {
        ycServiceAccountID: this.ycServiceAccountId.value.trim(),
        ycPublicKeyID: this.ycPublicKeyId.value.trim(),
        iv: bufferToString(iv),
        ycPrivateKey: encryptedPrivateKey,
        alorBrokerId: this.alorBroker.value,
        alorPortfolio: this.alorPortfolio.value.trim(),
        pusherApiId: this.pusherApi.value,
        updatedAt: new Date(),
        wardenKey: btoa(
          JSON.stringify({
            url: this.app.ppp.keyVault.getKey('mongo-location-url'),
            id: this.app.ppp.keyVault.getKey('mongo-app-client-id'),
            suffix: endpointSuffix
          })
        )
      };

      await this.app.ppp.user.functions.updateOne(
        {
          collection: 'psina'
        },
        {
          name: 'keys'
        },
        {
          $set: psinaKeys
        },
        {
          upsert: true
        }
      );

      this.psinaKeys = psinaKeys;
      this.succeedOperation();
    } catch (e) {
      if (/PCKS8 formatted string/i.test(e.message)) {
        e.name = 'ValidationError';
        e.message = 'Неверный формат закрытого ключа.';
      }

      this.failOperation(e);
    } finally {
      this.endOperation();
    }
  }
}
