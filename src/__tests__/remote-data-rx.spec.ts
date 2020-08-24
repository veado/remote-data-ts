import { pipe } from 'fp-ts/lib/pipeable';
import { flow, identity } from 'fp-ts/lib/function';
import * as O from 'fp-ts/lib/Option';
import * as T from 'fp-ts/lib/Task';
import * as IO from 'fp-ts/lib/IO';
import { array } from 'fp-ts/lib/Array';
import * as RDx from '../remote-data-rx';
import * as RD from '../remote-data';
import * as Rx from 'rxjs';

const M = RDx.observableRemoteData;

const double = (x: number) => x * 2;
const quad = flow(double, double);
const value = 1;
const successRD: RD.RemoteData<string, number> = RD.success(value);
const successDoubleRD: RD.RemoteData<string, number> = RD.success(double(value));
const failureRD: RD.RemoteData<string, number> = RD.failure('foo');
const progressRD: RD.RemoteData<string, number> = RD.progress({ loaded: 1, total: O.none });

const successM = M.of<string, number>(1);
const failureM = M.failure('foo');
const progressM = M.progress({ loaded: 1, total: O.none });

describe('ObservableRemoteData', () => {
	describe('typeclasses', () => {
		let sub: Rx.Subscription;

		afterEach(() => sub?.unsubscribe());

		describe('Functor', () => {
			describe('should map over value', () => {
				it('initial', async () => {
					const result = await M.map(M.initial, double).toPromise();
					expect(result).toEqual(RD.initial);
				});
				it('pending', async () => {
					const result = await M.map(M.pending, double).toPromise();
					expect(result).toEqual(RD.pending);
				});
				it('failure', async () => {
					const value = await M.map(failureM, double).toPromise();
					expect(value).toEqual(failureRD);
				});
				it('success', async () => {
					const result = await M.map(successM, double).toPromise();
					expect(result).toEqual(successDoubleRD);
				});
			});

			describe('laws', () => {
				describe('identity', () => {
					it('initial', async () => {
						const result = await M.map(M.initial, identity).toPromise();
						expect(result).toEqual(RD.initial);
					});
					it('pending', async () => {
						const result = await M.map(M.pending, identity).toPromise();
						expect(result).toEqual(RD.pending);
					});
					it('failure', async () => {
						const result = await M.map(failureM, identity).toPromise();
						expect(result).toEqual(failureRD);
					});
					it('success', async () => {
						const result = await M.map(successM, identity).toPromise();
						expect(result).toEqual(successRD);
					});
				});

				describe('composition', () => {
					it('initial', async () => {
						const result = await pipe(M.initial, RDx.map(double), RDx.map(double)).toPromise();
						expect(result).toEqual(RD.initial);
					});
					it('pending', async () => {
						const result = await pipe(M.pending, RDx.map(double), RDx.map(double)).toPromise();
						expect(result).toEqual(RD.pending);
					});
					it('failure', async () => {
						const result = await pipe(failureM, RDx.map(double), RDx.map(double)).toPromise();
						expect(result).toEqual(failureRD);
					});
					it('success', async () => {
						const expected = RD.success(quad(1));
						const result = await pipe(successM, RDx.map(double), RDx.map(double)).toPromise();
						expect(result).toEqual(expected);
					});
				});
			});
		});

		describe('Alt', () => {
			describe('should alt', () => {
				it('initial', async () => {
					const result1 = await M.alt(M.initial, () => M.initial).toPromise();
					expect(result1).toEqual(RD.initial);

					const result2 = await M.alt(M.initial, () => M.pending).toPromise();
					expect(result2).toEqual(RD.pending);

					const result3 = await M.alt(M.initial, () => failureM).toPromise();
					expect(result3).toEqual(failureRD);

					const result4 = await M.alt(M.initial, () => successM).toPromise();
					expect(result4).toEqual(successRD);
				});

				it('pending', async () => {
					const result1 = await M.alt(M.pending, () => M.initial).toPromise();
					expect(result1).toEqual(RD.initial);

					const result2 = await M.alt(M.pending, () => M.pending).toPromise();
					expect(result2).toEqual(RD.pending);

					const result3 = await M.alt(M.pending, () => failureM).toPromise();
					expect(result3).toEqual(failureRD);

					const result4 = await M.alt(M.pending, () => successM).toPromise();
					expect(result4).toEqual(successRD);
				});
				it('failure', async () => {
					const result1 = await M.alt(failureM, () => M.initial).toPromise();
					expect(result1).toEqual(RD.initial);

					const result2 = await M.alt(failureM, () => M.pending).toPromise();
					expect(result2).toEqual(RD.pending);

					const result3 = await M.alt(failureM, () => failureM).toPromise();
					expect(result3).toEqual(failureRD);

					const result4 = await M.alt(failureM, () => successM).toPromise();
					expect(result4).toEqual(successRD);
				});

				it('success', async () => {
					let result = await M.alt(successM, () => M.initial).toPromise();
					expect(result).toEqual(successRD);

					result = await M.alt(successM, () => M.pending).toPromise();
					expect(result).toEqual(successRD);

					result = await M.alt(successM, () => failureM).toPromise();
					expect(result).toEqual(successRD);

					result = await M.alt(successM, () => successM).toPromise();
					expect(result).toEqual(successRD);
				});
			});
		});
		describe('Apply', () => {
			describe('should ap', () => {
				const f = M.of(double);
				it('initial', async () => {
					const result1 = await M.ap(M.initial, M.initial).toPromise();
					expect(result1).toEqual(RD.initial);
					const result2 = await M.ap(M.pending, M.initial).toPromise();
					expect(result2).toEqual(RD.initial);
					const result3 = await M.ap(progressM, M.initial).toPromise();
					expect(result3).toEqual(RD.initial);
					const result4 = await M.ap(failureM, M.initial).toPromise();
					expect(result4).toEqual(failureRD);
					const result5 = await M.ap(f, M.initial).toPromise();
					expect(result5).toEqual(RD.initial);
				});
				it('pending', async () => {
					const result1 = await M.ap(M.initial, M.pending).toPromise();
					expect(result1).toEqual(RD.initial);
					const result2 = await M.ap(M.pending, M.pending).toPromise();
					expect(result2).toEqual(RD.pending);
					const result3 = await M.ap(progressM, M.pending).toPromise();
					expect(result3).toEqual(progressRD);
					const result4 = await M.ap(failureM, M.pending).toPromise();
					expect(result4).toEqual(failureRD);
					const result5 = await M.ap(f, M.pending).toPromise();
					expect(result5).toEqual(RD.pending);
				});
				it('failure', async () => {
					let result1 = await M.ap(M.initial, failureM).toPromise();
					expect(result1).toEqual(failureRD);
					result1 = await M.ap(M.pending, failureM).toPromise();
					expect(result1).toEqual(failureRD);
					result1 = await M.ap(progressM, failureM).toPromise();
					expect(result1).toEqual(failureRD);
					result1 = await M.ap(failureM, failureM).toPromise();
					expect(result1).toEqual(failureRD);
					const result2 = await M.ap(f, failureM).toPromise();
					expect(result2).toEqual(failureRD);
				});
				it('success', async () => {
					let result1 = await M.ap(M.initial, successM).toPromise();
					expect(result1).toEqual(RD.initial);
					result1 = await M.ap(M.pending, successM).toPromise();
					expect(result1).toEqual(RD.pending);
					result1 = await M.ap(progressM, successM).toPromise();
					expect(result1).toEqual(progressRD);
					result1 = await M.ap(failureM, successM).toPromise();
					expect(result1).toEqual(failureRD);
					const result2 = await M.ap(f, successM).toPromise();
					expect(result2).toEqual(successDoubleRD);
				});
			});
		});
		describe('Applicative', () => {
			describe('sequence', () => {
				const s = array.sequence(M);
				it('initial', async () => {
					const result = await s([M.initial, successM]).toPromise();
					expect(result).toEqual(RD.initial);
				});
				it('pending', async () => {
					const result = await s([M.pending, successM]).toPromise();
					expect(result).toEqual(RD.pending);
				});
				it('progress', async () => {
					const result = await s([progressM, successM]).toPromise();
					expect(result).toEqual(progressRD);
				});
				it('failure', async () => {
					const result = await s([failureM, successM]).toPromise();
					expect(result).toEqual(failureRD);
				});
				it('success', async () => {
					const result = await s([M.of(123), M.of(456)]).toPromise();
					expect(result).toEqual(RD.success([123, 456]));
				});
			});
		});
		describe('Chain', () => {
			describe('chain', () => {
				it('initial', async () => {
					let result = await M.chain(M.initial, () => M.initial).toPromise();
					expect(result).toEqual(RD.initial);
					result = await M.chain(M.initial, () => M.pending).toPromise();
					expect(result).toEqual(RD.initial);
					const result2 = await M.chain(M.initial, () => progressM).toPromise();
					expect(result2).toEqual(RD.initial);
					const result3 = await M.chain(M.initial, () => failureM).toPromise();
					expect(result3).toEqual(RD.initial);
					const result4 = await M.chain(M.initial, () => successM).toPromise();
					expect(result4).toEqual(RD.initial);
				});
				it('pending', async () => {
					let result = await M.chain(M.pending, () => M.initial).toPromise();
					expect(result).toEqual(RD.pending);
					result = await M.chain(M.pending, () => M.pending).toPromise();
					expect(result).toEqual(RD.pending);
					const result2 = await M.chain(M.pending, () => progressM).toPromise();
					expect(result2).toEqual(RD.pending);
					const result3 = await M.chain(M.pending, () => failureM).toPromise();
					expect(result3).toEqual(RD.pending);
					const result4 = await M.chain(M.pending, () => successM).toPromise();
					expect(result4).toEqual(RD.pending);
				});
				it('failure', async () => {
					let result = await M.chain(failureM, () => M.initial).toPromise();
					expect(result).toEqual(failureRD);
					result = await M.chain(failureM, () => M.pending).toPromise();
					expect(result).toEqual(failureRD);
					result = await M.chain(failureM, () => progressM).toPromise();
					expect(result).toEqual(failureRD);
					result = await M.chain(failureM, () => failureM).toPromise();
					expect(result).toEqual(failureRD);
					const result2 = await M.chain(failureM, () => successM).toPromise();
					expect(result2).toEqual(failureRD);
				});
				it('success', async () => {
					let result = await M.chain(successM, () => M.initial).toPromise();
					expect(result).toEqual(RD.initial);
					result = await M.chain(successM, () => M.pending).toPromise();
					expect(result).toEqual(RD.pending);
					result = await M.chain(successM, () => progressM).toPromise();
					expect(result).toEqual(progressRD);
					result = await M.chain(successM, () => failureM).toPromise();
					expect(result).toEqual(failureRD);
					const result2 = await M.chain(successM, () => successM).toPromise();
					expect(result2).toEqual(successRD);
				});
			});
		});
		describe('Bifunctor', () => {
			describe('bimap', () => {
				const f = (l: string): string => `Error: ${l}`;
				const g = double;
				it('initial', async () => {
					const result = await M.bimap(M.initial, identity, identity).toPromise();
					expect(result).toEqual(RD.initial);
					const result2 = await M.bimap(M.initial, f, g).toPromise();
					expect(result2).toEqual(RD.initial);
				});
				it('pending', async () => {
					const result = await M.bimap(M.pending, identity, identity).toPromise();
					expect(result).toEqual(RD.pending);
					const result2 = await M.bimap(M.pending, f, g).toPromise();
					expect(result2).toEqual(RD.pending);
				});
				it('failure', async () => {
					const result = await M.bimap(failureM, identity, identity).toPromise();
					expect(result).toEqual(failureRD);
					const result2 = await M.bimap(failureM, f, g).toPromise();
					expect(result2).toEqual(RD.failure('Error: foo'));
				});
				it('success', async () => {
					let result = await M.bimap(successM, identity, identity).toPromise();
					expect(result).toEqual(successRD);
					result = await M.bimap(successM, f, g).toPromise();
					expect(result).toEqual(successDoubleRD);
				});
			});
			describe('mapLeft', () => {
				const f2 = () => 1;
				it('initial', async () => {
					const result = await M.mapLeft(M.initial, f2).toPromise();
					expect(result).toEqual(RD.initial);
				});
				it('pending', async () => {
					const result = await M.mapLeft(M.pending, f2).toPromise();
					expect(result).toEqual(RD.pending);
				});
				it('failure', async () => {
					const result = await M.mapLeft(failureM, f2).toPromise();
					expect(result).toEqual(RD.failure(1));
				});
				it('success', async () => {
					const result = await M.mapLeft(successM, f2).toPromise();
					expect(result).toEqual(successRD);
				});
			});
		});
	});

	describe('top-level', () => {
		it('fromObservable', async () => {
			const result = await M.fromObservable(Rx.of(value)).toPromise();
			expect(result).toEqual(successRD);
		});
		it('fromTask', async () => {
			const result = await M.fromTask(T.of(value)).toPromise();
			expect(result).toEqual(successRD);
		});
		it('fromIO', async () => {
			const result = await M.fromIO(IO.of(value)).toPromise();
			expect(result).toEqual(successRD);
		});
		it('fromOption - some', async () => {
			const result = await M.fromOption(O.some(value), () => 'error').toPromise();
			expect(result).toEqual(successRD);
		});
		it('fromOption - none', async () => {
			const result = await M.fromOption(O.none, () => 'error').toPromise();
			expect(result).toEqual(RD.failure('error'));
		});
	});
});
